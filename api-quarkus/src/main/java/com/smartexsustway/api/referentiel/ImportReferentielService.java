package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.ImportReferentiel;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.StatutImportReferentiel;
import com.smartexsustway.api.domain.repository.ImportReferentielRepository;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.stockage.ControleFichierService;
import com.smartexsustway.api.stockage.StorageService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Import d'un référentiel : réception du fichier, contrôles, conservation,
 * et suivi de ce qu'il advient.
 *
 * Ce service orchestre, il n'extrait pas. Lire un PDF, comprendre une
 * structure, proposer des exigences : rien de tout cela n'est ici. Le
 * découpage suit celui déjà en place pour l'analyse de mission — Java tient
 * le cycle de vie et les garanties, le service d'agents fait le travail de
 * lecture.
 *
 * Deux règles ne sont pas décidées ici mais lues dans l'architecture
 * existante. Un référentiel n'admet qu'un seul brouillon à la fois (index
 * partiel de V46) : {@link VersionReferentielService} refuse le second, et ce
 * refus remonte tel quel. Et aucune proposition de l'IA n'atteint une version
 * publiée sans validation humaine : le déclencheur de V57 s'en charge, quel
 * que soit le chemin emprunté.
 */
@ApplicationScoped
public class ImportReferentielService {

    private static final Logger LOG = Logger.getLogger(ImportReferentielService.class);

    /**
     * Formats admis à l'import d'un référentiel.
     *
     * Liste distincte de celle des pièces justificatives d'audit : on
     * n'importe pas une grille depuis une photographie, et on ne dépose pas
     * un CSV comme preuve. Deux usages, deux listes.
     */
    public static final Set<String> TYPES_AUTORISES = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv",
            "application/json"
    );

    public static final Set<String> EXTENSIONS_AUTORISEES =
            Set.of(".pdf", ".docx", ".xlsx", ".csv", ".json");

    /**
     * Taille au-delà de laquelle le fichier est refusé.
     *
     * Alignée par défaut sur {@code quarkus.http.limits.max-body-size}, déjà
     * fixée à 20 Mo par le projet : au-delà, la couche HTTP coupe la requête
     * avant que ce service ne la voie, et annoncer une limite plus haute
     * promettrait ce qu'on ne peut pas tenir. Réglable si la limite HTTP
     * change.
     */
    @ConfigProperty(name = "smartex.import-referentiel.taille-maximale-octets",
                    defaultValue = "20971520")
    long tailleMaximale;

    @Inject ControleFichierService controleFichierService;
    @Inject StorageService storageService;
    @Inject ImportReferentielRepository importRepository;
    @Inject ReferentielRepository referentielRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject VersionReferentielService versionService;
    @Inject AuditLogService auditLogService;

    /** Refus du fichier reçu, avec le code que la ressource doit rendre. */
    public static class FichierRefuseException extends RuntimeException {
        private final int statutHttp;

        public FichierRefuseException(int statutHttp, String message) {
            super(message);
            this.statutHttp = statutHttp;
        }

        public int statutHttp() {
            return statutHttp;
        }
    }

    /**
     * Import créé, et ce qu'il faut en dire à l'appelant.
     *
     * `doublonsPossibles` recense les imports antérieurs portant la même
     * empreinte. L'information est remontée, jamais appliquée : réimporter le
     * même fichier peut être une méprise comme une reprise volontaire après
     * un échec, et rien dans le produit ne tranche entre les deux.
     */
    public record ImportCree(ImportReferentiel importReferentiel, List<UUID> doublonsPossibles) {
    }

    // --- Réception -----------------------------------------------------

    /**
     * Contrôle le fichier, le conserve, et ouvre son suivi.
     *
     * L'ordre est celui de {@link ControleFichierService} : rien n'est écrit
     * dans le stockage avant que l'antivirus ne se soit prononcé. Un fichier
     * refusé ne laisse donc aucune trace, ni objet stocké ni ligne de suivi —
     * il n'y a rien à conserver d'un fichier qu'on n'a pas accepté.
     */
    @Transactional
    public ImportCree recevoir(byte[] contenu, String nomFichier, String typeMime, UUID utilisateurId) {
        var verdict = controleFichierService.controler(contenu, nomFichier, typeMime,
                TYPES_AUTORISES, EXTENSIONS_AUTORISEES, tailleMaximale);

        if (verdict instanceof ControleFichierService.Verdict.Refuse refus) {
            auditLogService.journaliser(utilisateurId, null,
                    refus.statutScan() == com.smartexsustway.api.domain.enums.StatutScanDocument.INFECTE
                            ? "IMPORT_REFERENTIEL_REJETE_INFECTE"
                            : "IMPORT_REFERENTIEL_REJETE",
                    "import_referentiel", null);
            throw new FichierRefuseException(refus.statutHttp(), refus.message());
        }

        var accepte = (ControleFichierService.Verdict.Accepte) verdict;
        String cle = "referentiels/imports/" + UUID.randomUUID() + accepte.extension();
        storageService.televerser(cle, accepte.contenu(), typeMime);

        Utilisateur auteur = utilisateurRepository.findById(utilisateurId);
        var importReferentiel = new ImportReferentiel(nomFichier, typeMime, accepte.contenu().length,
                accepte.hash(), cle, accepte.statutScan(), auteur);
        importRepository.persist(importReferentiel);

        List<UUID> doublons = importRepository.parHash(accepte.hash()).stream()
                .map(ImportReferentiel::getId)
                .filter(id -> !id.equals(importReferentiel.getId()))
                .toList();

        auditLogService.journaliser(utilisateurId, null, "IMPORT_REFERENTIEL_CREE",
                "import_referentiel", importReferentiel.getId());
        LOG.infof("Import de référentiel %s ouvert : %s (%d octets, %s)",
                importReferentiel.getId(), nomFichier, accepte.contenu().length, accepte.hash());

        return new ImportCree(importReferentiel, doublons);
    }

    // --- Cycle de vie ---------------------------------------------------

    /**
     * Marque le début de l'extraction, dans sa propre transaction.
     *
     * Le traitement de fond s'exécute après la fin de la requête HTTP qui l'a
     * lancé et ne peut pas emprunter sa session : c'est le défaut corrigé en
     * phase 2, où la passe d'analyse mourait par intermittence sur
     * « statement fermé ». Chaque étape ouvre donc la sienne.
     */
    @Transactional
    public void demarrerAnalyse(UUID importId) {
        ImportReferentiel importReferentiel = importRepository.findById(importId);
        if (importReferentiel == null) {
            return;
        }
        importReferentiel.marquerAnalyseEnCours();
        auditLogService.journaliser(auteurDe(importReferentiel), null,
                "IMPORT_REFERENTIEL_ANALYSE_LANCEE", "import_referentiel", importId);
    }

    /**
     * L'extraction a abouti : le contenu proposé est déposé dans un
     * brouillon, et l'import s'y rattache.
     */
    @Transactional
    public void marquerBrouillonGenere(UUID importId, UUID versionId, Map<String, Object> metadonnees) {
        ImportReferentiel importReferentiel = importRepository.findById(importId);
        if (importReferentiel == null) {
            return;
        }
        ReferentielVersion version = versionService.parId(versionId);
        importReferentiel.marquerBrouillonGenere(version, metadonnees);
        auditLogService.journaliser(auteurDe(importReferentiel), null,
                "IMPORT_REFERENTIEL_BROUILLON_GENERE", "import_referentiel", importId);
        LOG.infof("Import %s : brouillon %s généré", importId, versionId);
    }

    /**
     * L'extraction a échoué.
     *
     * Le fichier source n'est pas supprimé : comprendre pourquoi une
     * extraction a échoué suppose de pouvoir rouvrir le fichier qui l'a fait
     * échouer.
     */
    @Transactional
    public void marquerEchec(UUID importId, String motif) {
        ImportReferentiel importReferentiel = importRepository.findById(importId);
        if (importReferentiel == null) {
            return;
        }
        importReferentiel.marquerEchec(motif);
        auditLogService.journaliser(auteurDe(importReferentiel), null,
                "IMPORT_REFERENTIEL_ECHEC", "import_referentiel", importId);
        LOG.warnf("Import %s en échec : %s", importId, motif);
    }

    // --- Version cible ---------------------------------------------------

    /**
     * Ouvre le brouillon qui recevra le contenu proposé.
     *
     * Trois cas, et aucun n'est tranché ici. Le référentiel n'existe pas : il
     * est créé, avec sa première version en brouillon — c'est ce que fait
     * déjà la création d'un référentiel par le back-office. Il existe et
     * porte une version publiée : un brouillon en est dérivé, contenu
     * compris. Il porte déjà un brouillon : {@link VersionReferentielService}
     * refuse le second, conformément à l'index partiel de V46, et le refus
     * remonte à l'appelant plutôt que d'être contourné.
     *
     * Aucune écriture directe dans les tables de contenu : le versionnement
     * reste seul maître de la création des versions.
     */
    @Transactional
    public ReferentielVersion ouvrirBrouillonCible(String codeReferentiel, String nomReferentiel,
                                                   String typeReferentiel, String numeroVersion,
                                                   UUID utilisateurId) {
        Utilisateur auteur = utilisateurRepository.findById(utilisateurId);
        Optional<Referentiel> existant = referentielRepository.parCode(codeReferentiel);

        if (existant.isEmpty()) {
            var referentiel = new Referentiel(codeReferentiel, nomReferentiel,
                    com.smartexsustway.api.domain.enums.TypeReferentiel.valueOf(typeReferentiel));
            referentielRepository.persistAndFlush(referentiel);
            auditLogService.journaliser(utilisateurId, null, "REFERENTIEL_CREE",
                    "referentiel", referentiel.getId());
            return versionService.creerVersionInitiale(referentiel, auteur);
        }

        Referentiel referentiel = existant.get();
        return versionService.creerBrouillon(referentiel, numeroVersion,
                "Brouillon issu d'un import assisté.", auteur);
    }

    // --- Lecture ---------------------------------------------------------

    public ImportReferentiel parId(UUID importId) {
        return importRepository.findById(importId);
    }

    public List<ImportReferentiel> tous() {
        return importRepository.tous();
    }

    /** Contenu du fichier source, tel qu'il a été reçu. */
    public byte[] fichierSource(ImportReferentiel importReferentiel) {
        return storageService.telecharger(importReferentiel.getCleStockage());
    }

    /** Un import déjà traité ne se relance pas : son résultat serait écrasé sans trace. */
    public boolean peutEtreAnalyse(ImportReferentiel importReferentiel) {
        return importReferentiel.getStatut() == StatutImportReferentiel.EN_ATTENTE
                || importReferentiel.getStatut() == StatutImportReferentiel.ECHEC;
    }

    private UUID auteurDe(ImportReferentiel importReferentiel) {
        return importReferentiel.getImportePar() == null
                ? null : importReferentiel.getImportePar().getId();
    }
}
