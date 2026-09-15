package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.resource.dto.ErreurDto;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.hibernate.exception.ConstraintViolationException;
import org.jboss.logging.Logger;
import org.postgresql.util.PSQLException;
import org.postgresql.util.ServerErrorMessage;

import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

/**
 * Traduit en 409 un refus posé par la base sur une justification de mapping
 * bailleur (V74), et en 500 générique toute autre violation de contrainte.
 *
 * <p>Pourquoi un relais : la suppression d'un mapping justifié — directement
 * par {@code CritereBailleurResource}, ou par cascade depuis la suppression
 * d'une version brouillon — bute sur {@code cbj_mapping_fkey} en RESTRICT.
 * Ces chemins existent déjà et ne sont pas modifiés ; sans relais, le refus
 * sortirait en 500, alors qu'il s'agit d'un conflit d'état que l'appelant
 * peut résoudre.
 *
 * <p>Le nom de contrainte est lu dans le message structuré du serveur
 * ({@link ServerErrorMessage#getConstraint()}), jamais dans le texte de
 * l'exception : Hibernate l'extrait du texte, que le pilote traduit
 * partiellement, et ne reconnaît pas les refus levés par un déclencheur.
 *
 * <p>JAX-RS ne laisse pas un relais décliner une exception : ce relais
 * répond donc aussi pour les contraintes étrangères à V74. Il leur garde le
 * 500 qu'elles produisaient déjà, journalise l'exception entière, et ne
 * renvoie ni SQL ni nom de contrainte.
 */
@Provider
public class ContrainteJustificationMapper implements ExceptionMapper<ConstraintViolationException> {

    private static final Logger LOG = Logger.getLogger(ContrainteJustificationMapper.class);

    private static final String PREFIXE_V74 = "cbj_";

    /** Garde-fou contre une chaîne de causes cyclique. */
    private static final int PROFONDEUR_MAX = 32;

    private static final String MESSAGE_UTILISATEUR =
            "Un utilisateur tracé sur une justification doit exister et ne peut plus être supprimé.";

    private static final Map<String, String> MESSAGES = Map.ofEntries(
            Map.entry("cbj_mapping_fkey",
                    "Ce mapping porte un historique de justification : il ne peut plus être supprimé, "
                            + "ni directement, ni avec la version brouillon qui le contient. "
                            + "Pour qu'il ne compte plus, passez-le à applicable = false."),
            Map.entry("cbj_vivante_uidx",
                    "Une justification est déjà en cours pour ce mapping : modifiez-la, rejetez-la ou périmez-la "
                            + "avant d'en créer une autre."),
            Map.entry("cbj_immuable_apres_decision",
                    "Cette justification a déjà été tranchée : seule la péremption d'une justification validée "
                            + "reste possible. Créez une nouvelle justification pour toute nouvelle tentative."),
            Map.entry("cbj_peremption_definitive",
                    "Cette justification est déjà périmée : sa péremption est définitive."),
            Map.entry("cbj_identite_figee",
                    "Le mapping, l'auteur et la date de création d'une justification ne changent pas."),
            Map.entry("cbj_suppression_interdite",
                    "Une justification ne se supprime pas : rejetez-la ou périmez-la."),
            Map.entry("cbj_validation_exige_preuve_complete",
                    "La validation exige une preuve complète : document, édition, organisme, référence officielle, "
                            + "texte source et justification non vides, et une correspondance déterminée."),
            Map.entry("cbj_rejet_motive",
                    "Un rejet exige un motif."),
            Map.entry("cbj_motif_suppose_rejet",
                    "Un motif de rejet suppose un rejet."),
            Map.entry("cbj_peremption_tracee",
                    "Une péremption exige son auteur, sa date et un motif."),
            Map.entry("cbj_motif_suppose_peremption",
                    "Un motif de péremption suppose une péremption."),
            Map.entry("cbj_peremption_apres_validation",
                    "Seule une justification validée peut être périmée."),
            Map.entry("cbj_decision_exclusive",
                    "Une justification ne peut pas être à la fois validée et rejetée."),
            Map.entry("cbj_dates_de_decision_coherentes",
                    "Chaque décision sur une justification porte son auteur et sa date."),
            Map.entry("cbj_modification_coherente",
                    "Une modification de justification porte son auteur et sa date."),
            Map.entry("cbj_confiance_bornee",
                    "La confiance est comprise entre 0 et 1."),
            Map.entry("cbj_created_by_fkey", MESSAGE_UTILISATEUR),
            Map.entry("cbj_modifiee_par_fkey", MESSAGE_UTILISATEUR),
            Map.entry("cbj_validee_par_fkey", MESSAGE_UTILISATEUR),
            Map.entry("cbj_rejetee_par_fkey", MESSAGE_UTILISATEUR),
            Map.entry("cbj_perimee_par_fkey", MESSAGE_UTILISATEUR)
    );

    private static final String MESSAGE_V74_PAR_DEFAUT =
            "Opération refusée par les règles de justification des mappings bailleur.";

    @Override
    public Response toResponse(ConstraintViolationException exception) {
        Optional<String> contrainte = nomDeContrainte(exception);
        if (contrainte.isPresent() && contrainte.get().startsWith(PREFIXE_V74)) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(new ErreurDto(MESSAGES.getOrDefault(contrainte.get(), MESSAGE_V74_PAR_DEFAUT)))
                    .build();
        }
        LOG.error("Violation de contrainte hors justification de mapping bailleur", exception);
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErreurDto("Erreur interne"))
                .build();
    }

    /**
     * Premier nom de contrainte porté par un message serveur PostgreSQL dans
     * la chaîne des causes, y compris les exceptions chaînées d'un lot JDBC.
     */
    static Optional<String> nomDeContrainte(Throwable exception) {
        Throwable courante = exception;
        for (int profondeur = 0; courante != null && profondeur < PROFONDEUR_MAX; profondeur++) {
            Optional<String> trouve = nomPorte(courante);
            if (trouve.isPresent()) {
                return trouve;
            }
            if (courante instanceof SQLException sql && sql.getNextException() != null) {
                trouve = nomPorte(sql.getNextException());
                if (trouve.isPresent()) {
                    return trouve;
                }
            }
            if (courante.getCause() == courante) {
                break;
            }
            courante = courante.getCause();
        }
        return Optional.empty();
    }

    private static Optional<String> nomPorte(Throwable exception) {
        if (exception instanceof PSQLException psql) {
            ServerErrorMessage message = psql.getServerErrorMessage();
            if (message != null && message.getConstraint() != null) {
                return Optional.of(message.getConstraint());
            }
        }
        return Optional.empty();
    }
}
