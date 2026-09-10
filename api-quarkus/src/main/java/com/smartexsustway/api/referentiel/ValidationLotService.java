package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.domain.repository.RegleAnalyseRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

/**
 * Validation de plusieurs propositions en une seule fois.
 *
 * Relire un référentiel importé, c'est trancher des dizaines d'éléments.
 * Un appel par élément ferait autant d'allers-retours, autant de transactions,
 * et laisserait l'écran dans un état intermédiaire à chaque interruption.
 *
 * Le lot est atomique : soit tout passe, soit rien. Une validation partielle
 * silencieuse serait le pire des résultats — l'écran afficherait un
 * avancement, et personne ne saurait lesquels ont réellement été retenus.
 * Le premier élément refusé fait donc échouer l'ensemble, avec le motif et
 * l'identifiant fautif.
 *
 * Le lot est borné par la version : chaque élément doit appartenir à celle du
 * brouillon visé. C'est la garde contre l'accès indirect — sans elle, un
 * identifiant glissé dans la liste ferait valider une proposition d'un autre
 * référentiel, à l'insu de l'écran qui l'a envoyé.
 */
@ApplicationScoped
public class ValidationLotService {

    private static final Logger LOG = Logger.getLogger(ValidationLotService.class);

    /**
     * Au-delà, l'appel est refusé plutôt que tronqué.
     *
     * Un lot sans borne ouvre une transaction dont personne ne connaît la
     * durée, et un référentiel complet se relit de toute façon écran par
     * écran. La limite est large : elle écarte l'abus, pas l'usage.
     */
    public static final int TAILLE_LOT_MAXIMALE = 500;

    @Inject ValidationContenuImporteService validationService;
    @Inject ExigenceRepository exigenceRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject RegleAnalyseRepository regleAnalyseRepository;
    @Inject AuditLogService auditLogService;

    /** Un élément désigné dans le lot. */
    public record ElementVise(String nature, UUID id) {
    }

    /** Ce que le lot a produit. */
    public record ResultatLot(int traites, int dejaValides) {
    }

    /**
     * Valide tout le lot, ou rien.
     *
     * Une seule transaction couvre l'ensemble : les services appelés portent
     * {@code @Transactional} en propagation par défaut et rejoignent
     * celle-ci. Une exception au dixième élément annule les neuf premiers.
     */
    @Transactional
    public ResultatLot validerTout(ReferentielVersion version, List<ElementVise> elements,
                                   UUID utilisateurId) {
        if (elements == null || elements.isEmpty()) {
            throw new ValidationContenuImporteService.ValidationRefuseeException(400,
                    "Le lot ne désigne aucun élément");
        }
        if (elements.size() > TAILLE_LOT_MAXIMALE) {
            throw new ValidationContenuImporteService.ValidationRefuseeException(400,
                    "Le lot dépasse " + TAILLE_LOT_MAXIMALE + " éléments (" + elements.size() + ")");
        }

        // Un même élément désigné deux fois n'est pas une erreur : l'écran a
        // pu cocher une case deux fois. La seconde occurrence serait de toute
        // façon sans effet, la validation étant rejouable ; l'écarter ici rend
        // seulement le compte rendu honnête.
        var vises = new LinkedHashSet<>(elements);
        if (vises.size() < elements.size()) {
            LOG.debugf("Lot de validation : %d doublon(s) écarté(s)", elements.size() - vises.size());
        }

        int dejaValides = 0;
        for (ElementVise vise : vises) {
            var resultat = valider(version, vise, utilisateurId);
            if (resultat.dejaValidee()) {
                dejaValides++;
            }
        }

        journaliser(version, vises, utilisateurId, dejaValides);
        return new ResultatLot(vises.size(), dejaValides);
    }

    private ValidationContenuImporteService.Resultat valider(ReferentielVersion version,
                                                             ElementVise vise, UUID utilisateurId) {
        if (vise.id() == null) {
            throw new ValidationContenuImporteService.ValidationRefuseeException(400,
                    "Un élément du lot est désigné sans identifiant");
        }
        UUID versionAttendue = version.getId();

        return switch (nature(vise)) {
            case "EXIGENCE" -> {
                Exigence exigence = exigenceRepository.findById(vise.id());
                exigerTrouve(exigence, vise);
                yield validationService.validerExigence(exigence, versionAttendue, utilisateurId);
            }
            case "PREUVE_ATTENDUE" -> {
                PreuveAttendue preuve = preuveAttendueRepository.findById(vise.id());
                exigerTrouve(preuve, vise);
                yield validationService.validerPreuveAttendue(preuve, versionAttendue, utilisateurId);
            }
            case "REGLE_ANALYSE" -> {
                RegleAnalyse regle = regleAnalyseRepository.findById(vise.id());
                exigerTrouve(regle, vise);
                yield validationService.validerRegle(regle, versionAttendue, utilisateurId);
            }
            default -> throw new ValidationContenuImporteService.ValidationRefuseeException(400,
                    "Nature inconnue dans le lot : « " + vise.nature() + " »");
        };
    }

    private static String nature(ElementVise vise) {
        return vise.nature() == null ? "" : vise.nature().trim().toUpperCase();
    }

    /**
     * Un identifiant introuvable fait échouer le lot entier.
     *
     * L'ignorer laisserait croire que tout a été traité alors qu'un élément
     * est passé à la trappe — exactement la validation partielle silencieuse
     * que ce service existe pour empêcher.
     */
    private static void exigerTrouve(Object element, ElementVise vise) {
        if (element == null) {
            throw new ValidationContenuImporteService.ValidationRefuseeException(404,
                    "Élément introuvable dans le lot : " + vise.nature() + " " + vise.id());
        }
    }

    private void journaliser(ReferentielVersion version, LinkedHashSet<ElementVise> vises,
                             UUID utilisateurId, int dejaValides) {
        // Une seule entrée pour le lot, en plus de celles que chaque
        // validation écrit déjà. Elle dit qui a lancé l'opération et sur quoi ;
        // les entrées individuelles disent ce qui a effectivement changé.
        String identifiants = vises.stream()
                .map(v -> "\"" + v.nature() + ":" + v.id() + "\"")
                .reduce((a, b) -> a + "," + b)
                .orElse("");
        String details = """
                {"referentiel_version_id":"%s","version_numero":"%s","referentiel_code":"%s",\
"elements":[%s],"traites":%d,"deja_valides":%d}"""
                .formatted(version.getId(), echapper(version.getNumero()),
                        echapper(version.getReferentiel().getCode()),
                        identifiants, vises.size(), dejaValides);

        auditLogService.journaliserAvecDetails(utilisateurId, null,
                "CONTENU_IMPORTE_VALIDE_EN_LOT", "referentiel_version", version.getId(), details);
    }

    private static String echapper(String valeur) {
        return valeur == null ? "" : valeur.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
