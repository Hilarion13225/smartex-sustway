package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.OrigineContenu;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * D'où vient un élément du référentiel, qui en répond, et ce qu'on en a fait.
 *
 * Rassemblé en un objet plutôt qu'éparpillé en dix champs sur chacune des
 * trois entités : l'écran de relecture pose les mêmes questions à une
 * exigence, à une preuve attendue et à une règle, et doit les lire au même
 * endroit.
 *
 * {@code origineInitiale} ne change jamais après la création. C'est ce qui
 * distingue un contenu rédigé à la main d'une proposition reprise à son
 * compte, longtemps après que {@code origine} soit passée à CONTENU_HUMAIN.
 *
 * {@code decision} résume l'état pour l'affichage — mais chaque champ reste
 * lisible séparément : un écran qui n'aurait que le résumé ne pourrait plus
 * dire qui a tranché ni quand.
 */
public record ProvenanceDto(
        String origine,
        String origineInitiale,
        String decision,
        boolean validee,
        UUID valideePar,
        String valideeParNom,
        Instant valideeLe,
        boolean rejetee,
        UUID rejeteePar,
        String rejeteeParNom,
        Instant rejeteeLe,
        String motifRejet,
        SourceDto source
) {

    /** Décisions possibles sur une proposition. Valeurs stables pour le client. */
    public static final String A_VERIFIER = "A_VERIFIER";
    public static final String VALIDEE = "VALIDEE";
    public static final String REJETEE = "REJETEE";
    /** Contenu qui n'est pas issu d'un import : il n'y a rien à trancher. */
    public static final String SANS_OBJET = "SANS_OBJET";

    /**
     * D'où la proposition a été tirée du document, quand le service d'agents
     * a pu le mesurer.
     *
     * Nulle en entier pour un contenu qui n'en vient pas. Chaque champ reste
     * nul individuellement quand le format ne permet pas de le connaître : un
     * CSV n'a pas de page, un PDF n'a pas de ligne. Rien n'est estimé — une
     * localisation approximative enverrait le relecteur au mauvais endroit
     * avec confiance.
     */
    public record SourceDto(String texte, Map<String, Object> localisation, BigDecimal confiance) {
    }

    public static ProvenanceDto depuis(Exigence e) {
        return construire(e.getOrigine(), e.getOrigineInitiale(),
                e.getValideePar(), e.getValideeLe(),
                e.getRejeteePar(), e.getRejeteeLe(), e.getMotifRejet(),
                e.getTexteSource(), e.getLocalisation(), e.getConfiance());
    }

    public static ProvenanceDto depuis(PreuveAttendue p) {
        return construire(p.getOrigine(), p.getOrigineInitiale(),
                p.getValideePar(), p.getValideeLe(),
                p.getRejeteePar(), p.getRejeteeLe(), p.getMotifRejet(),
                p.getTexteSource(), p.getLocalisation(), p.getConfiance());
    }

    public static ProvenanceDto depuis(RegleAnalyse r) {
        return construire(r.getOrigine(), r.getOrigineInitiale(),
                r.getValideePar(), r.getValideeLe(),
                r.getRejeteePar(), r.getRejeteeLe(), r.getMotifRejet(),
                r.getTexteSource(), r.getLocalisation(), r.getConfiance());
    }

    private static ProvenanceDto construire(OrigineContenu origine, OrigineContenu origineInitiale,
                                            Utilisateur validateur, Instant valideeLe,
                                            Utilisateur rejeteur, Instant rejeteeLe, String motif,
                                            String texteSource, Map<String, Object> localisation,
                                            BigDecimal confiance) {
        boolean estValidee = validateur != null;
        boolean estRejetee = rejeteur != null;
        boolean vientDeLIa = origineInitiale == OrigineContenu.IMPORT_IA;

        String decision;
        if (estValidee) {
            decision = VALIDEE;
        } else if (estRejetee) {
            decision = REJETEE;
        } else if (vientDeLIa) {
            decision = A_VERIFIER;
        } else {
            decision = SANS_OBJET;
        }

        SourceDto source = (texteSource == null && localisation == null && confiance == null)
                ? null
                : new SourceDto(texteSource, localisation, confiance);

        return new ProvenanceDto(
                origine == null ? null : origine.name(),
                origineInitiale == null ? null : origineInitiale.name(),
                decision,
                estValidee, identifiant(validateur), libelle(validateur), valideeLe,
                estRejetee, identifiant(rejeteur), libelle(rejeteur), rejeteeLe, motif,
                source);
    }

    private static UUID identifiant(Utilisateur u) {
        return u == null ? null : u.getId();
    }

    private static String libelle(Utilisateur u) {
        return u == null ? null : u.getPrenom() + " " + u.getNom();
    }

    /**
     * Vrai si l'élément bloque encore la publication de sa version.
     *
     * Reprend le prédicat du déclencheur `refuser_publication_sans_validation`
     * (V58) plutôt que d'en proposer un autre : deux définitions de la même
     * condition finiraient par diverger, et l'écran annoncerait publiable une
     * version que la base refuse.
     */
    public boolean bloquePublication() {
        return OrigineContenu.IMPORT_IA.name().equals(origine) && !validee && !rejetee;
    }
}
