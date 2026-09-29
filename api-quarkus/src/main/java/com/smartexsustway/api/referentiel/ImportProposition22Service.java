package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.UUID;

/**
 * Importe une proposition d'enrichissement dans une version neuve.
 *
 * Cette classe existe pour une raison mécanique, la même qui a fait naître
 * {@link DepotImportTransactionnel} : {@code @Transactional} est un
 * intercepteur CDI, et il n'agit pas sur une méthode qu'une classe s'appelle à
 * elle-même. Ouvrir la version dans une transaction et l'enrichir dans une
 * autre laisserait, en cas d'échec, un brouillon vide dont personne n'aurait
 * demandé la création — et que le verrou de brouillon unique empêcherait de
 * refaire.
 *
 * Tout tient donc dans une seule transaction : création de la version, copie
 * de la version publiée, enrichissement. Une erreur à n'importe quel moment
 * annule l'ensemble, et la base retrouve exactement l'état d'avant.
 *
 * La validation de la structure du document, elle, a lieu <em>avant</em> —
 * hors transaction, dans {@link #importer}. Un document mal formé ne doit pas
 * même ouvrir de brouillon.
 */
@ApplicationScoped
public class ImportProposition22Service {

    @Inject ReferentielRepository referentielRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject VersionReferentielService versionService;
    @Inject EnrichissementVersionService enrichissementService;
    @Inject AuditLogService auditLogService;

    /** Ce que l'import a produit, rendu à l'appelant. */
    public record Resultat(UUID versionId, String numero, int descriptions, int preuves,
                           int regles, int criteresSansRegle) {
    }

    /** Une demande que l'état du catalogue ne permet pas de satisfaire. */
    public static class ImportRefuseException extends RuntimeException {
        private final int statutHttp;

        public ImportRefuseException(int statutHttp, String message) {
            super(message);
            this.statutHttp = statutHttp;
        }

        public int statutHttp() {
            return statutHttp;
        }
    }

    /**
     * Applique la proposition au référentiel visé, dans une version neuve.
     *
     * @param codeReferentiel code attendu — vérifié contre celui du document,
     *                        pour qu'une proposition ne puisse pas être
     *                        appliquée au mauvais catalogue
     * @param numeroVersion   numéro de la version à ouvrir. Il n'est pas
     *                        déduit : une numérotation inventée s'inscrirait
     *                        dans le catalogue et suivrait chaque mission
     *                        menée sur cette version
     */
    @Transactional
    public Resultat importer(String codeReferentiel, String numeroVersion,
                             Proposition22Dto proposition, UUID utilisateurId) {
        Referentiel referentiel = referentielRepository.parCode(codeReferentiel)
                .orElseThrow(() -> new ImportRefuseException(404,
                        "Le référentiel " + codeReferentiel + " n'existe pas"));

        exigerDocumentDuBonReferentiel(referentiel, proposition);

        if (proposition.criteres() == null || proposition.criteres().isEmpty()) {
            // Ouvrir une version pour n'y rien écrire laisserait un brouillon
            // que personne n'a demandé, et que le verrou de brouillon unique
            // empêcherait de remplacer.
            throw new ImportRefuseException(422,
                    "La proposition ne contient aucun critère : il n'y a rien à enrichir");
        }

        Utilisateur auteur = utilisateurRepository.findById(utilisateurId);
        if (auteur == null) {
            throw new ImportRefuseException(403, "Auteur de l'import introuvable");
        }

        ReferentielVersion brouillon;
        try {
            // Crée la version ET y recopie la version publiée. Le verrou de
            // brouillon unique est vérifié ici : un second import ne peut pas
            // ouvrir une seconde version.
            brouillon = versionService.creerBrouillon(referentiel, numeroVersion,
                    "Brouillon issu d'un import de proposition d'enrichissement.", auteur);
        } catch (VersionReferentielService.VersionFigeeException e) {
            throw new ImportRefuseException(409, e.getMessage());
        }

        if (brouillon.getRemplaceVersion() == null) {
            // Sans version publiée à enrichir, il n'y a rien à quoi rattacher
            // les descriptions : le brouillon serait vide, et chaque critère de
            // la proposition manquerait.
            throw new ImportRefuseException(409,
                    "Le référentiel " + codeReferentiel + " n'a aucune version publiée : "
                            + "une proposition enrichit un catalogue existant, elle n'en crée pas");
        }

        EnrichissementVersionService.Compte compte;
        try {
            compte = enrichissementService.appliquer(brouillon, proposition);
        } catch (EnrichissementVersionService.EnrichissementRefuseException e) {
            throw new ImportRefuseException(422, e.getMessage());
        }

        auditLogService.journaliser(utilisateurId, null, "PROPOSITION_IMPORTEE",
                "referentiel_version", brouillon.getId());

        return new Resultat(brouillon.getId(), brouillon.getNumero(),
                compte.descriptions(), compte.preuves(), compte.regles(),
                compte.criteresSansRegle());
    }

    /**
     * Refuse une proposition qui ne vise pas ce référentiel.
     *
     * Le document porte le code auquel il se destine. Appliquer une
     * proposition au mauvais catalogue ne produirait pas d'erreur visible —
     * chaque critère serait simplement introuvable, et le message ne dirait
     * pas pourquoi.
     */
    private void exigerDocumentDuBonReferentiel(Referentiel referentiel, Proposition22Dto proposition) {
        var meta = proposition.meta();
        if (meta == null || meta.referentiel() == null || meta.referentiel().isBlank()) {
            throw new ImportRefuseException(422,
                    "La proposition ne précise pas à quel référentiel elle se destine");
        }
        if (!meta.referentiel().equals(referentiel.getCode())) {
            throw new ImportRefuseException(422,
                    "La proposition vise le référentiel " + meta.referentiel()
                            + ", pas " + referentiel.getCode());
        }
    }
}
