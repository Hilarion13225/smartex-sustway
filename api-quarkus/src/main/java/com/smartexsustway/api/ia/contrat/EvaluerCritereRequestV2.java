package com.smartexsustway.api.ia.contrat;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrat IA V2 — ce que l'API soumet au service d'agents.
 *
 * Le V1 était plat : douze champs de même rang, un seul consommateur
 * implicite. Il suffisait tant qu'un unique agent exploitait le contexte. Dès
 * lors que quatre agents doivent en recevoir des sous-ensembles différents —
 * et volontairement inégaux — la platitude empêche d'exprimer qui reçoit quoi.
 *
 * Le découpage en blocs ne transporte rien de plus sur le réseau : le payload
 * reste unique. Ce qu'il permet, c'est que l'orchestrateur compose l'entrée de
 * chaque agent à partir de frontières nommées, et que le moindre privilège
 * devienne vérifiable par lecture et par test plutôt que déclaré dans un
 * commentaire.
 *
 * Ce record décrit la forme. Sa construction — et les invariants qui la
 * gouvernent — vivent dans {@link ConstructionContexteIa}.
 *
 * Les blocs optionnels sont absents du JSON plutôt que présents à null
 * ({@code JsonInclude.NON_NULL}) : un bloc vide inviterait le modèle à
 * commenter l'ignorance, là où son absence ne lui dit rien.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EvaluerCritereRequestV2(

        @JsonProperty("contrat_version") String contratVersion,
        @JsonProperty("tracabilite") Tracabilite tracabilite,
        @JsonProperty("situation") Situation situation,
        @JsonProperty("critere") Critere critere,
        @JsonProperty("catalogue") Catalogue catalogue,
        @JsonProperty("declaration") Declaration declaration,
        @JsonProperty("pieces") List<Piece> pieces,
        @JsonProperty("organisation") Organisation organisation,
        @JsonProperty("options") Options options
) {

    /** Version courante du contrat. Voir la spécification, §19. */
    public static final String VERSION = "2.0";

    /**
     * Identifiants de corrélation.
     *
     * Aucun agent ne les reçoit : des UUID n'ont aucune valeur pour un modèle
     * de langage et n'apporteraient que du bruit. Ils servent la corrélation
     * des journaux et la persistance du résultat.
     */
    public record Tracabilite(
            @JsonProperty("audit_id") UUID auditId,
            @JsonProperty("audit_critere_id") UUID auditCritereId,
            @JsonProperty("referentiel_version_id") UUID referentielVersionId
    ) {
    }

    /**
     * Où l'on se trouve dans le catalogue.
     *
     * Un même code de critère existe dans plusieurs référentiels aux attentes
     * distinctes : sans le référentiel, « D1-01 » ne désigne rien.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Situation(
            @JsonProperty("referentiel_code") String referentielCode,
            @JsonProperty("referentiel_nom") String referentielNom,
            @JsonProperty("version_numero") String versionNumero,
            @JsonProperty("domaine_code") String domaineCode,
            @JsonProperty("domaine_nom") String domaineNom,
            @JsonProperty("sous_domaine_code") String sousDomaineCode,
            @JsonProperty("sous_domaine_nom") String sousDomaineNom
    ) {
    }

    /** Ce qui est audité. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Critere(
            @JsonProperty("code") String code,
            @JsonProperty("libelle") String libelle,
            @JsonProperty("description") String description
    ) {
    }

    /**
     * Ce que le référentiel exige, et comment le vérifier.
     *
     * Bloc indissociable : une règle désigne sa cible par la référence d'une
     * exigence ou d'une preuve attendue de ces mêmes listes. Les séparer
     * casserait ces rattachements.
     *
     * Les trois listes peuvent être vides sans que ce soit une anomalie —
     * 37 des 92 critères du catalogue publié ne portent aucune règle.
     */
    public record Catalogue(
            @JsonProperty("exigences") List<Exigence> exigences,
            @JsonProperty("preuves_attendues") List<PreuveAttendue> preuvesAttendues,
            @JsonProperty("regles_analyse") List<RegleAnalyse> reglesAnalyse
    ) {
    }

    public record Exigence(
            @JsonProperty("code") String code,
            @JsonProperty("intitule") String intitule,
            @JsonProperty("enonce") String enonce
    ) {
    }

    /**
     * Ce que l'audit attend en démonstration — à ne pas confondre avec les
     * pièces, qui sont ce que l'organisation a réellement déposé.
     *
     * {@code reference} est locale au payload : elle est produite par Java à
     * la construction, ne vient jamais du modèle ni de la base, et n'est pas
     * comparable d'une requête à l'autre. Voir
     * {@link ReferencesPreuvesAttendues}.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PreuveAttendue(
            @JsonProperty("reference") String reference,
            @JsonProperty("exigence_code") String exigenceCode,
            @JsonProperty("type") String type,
            @JsonProperty("libelle") String libelle,
            @JsonProperty("description") String description,
            @JsonProperty("obligatoire") boolean obligatoire
    ) {
    }

    /**
     * Une règle du référentiel et sa portée.
     *
     * {@code definition} reste une carte libre : ses clés varient d'un type de
     * règle à l'autre — {@code elements}, {@code mention_attendue},
     * {@code champ}, {@code anciennete_maximale_mois} — et le schéma est
     * ouvert par conception. Une classe dédiée figerait ce que le référentiel
     * a précisément voulu laisser extensible.
     */
    public record RegleAnalyse(
            @JsonProperty("code") String code,
            @JsonProperty("type") String type,
            @JsonProperty("libelle") String libelle,
            @JsonProperty("severite") String severite,
            @JsonProperty("portee") Portee portee,
            @JsonProperty("definition") Map<String, Object> definition
    ) {
    }

    /**
     * Sur quoi porte une règle.
     *
     * Le V1 laissait la portée se déduire de deux champs nullables, cascade
     * reproduite à l'identique côté Python : une logique métier implicite,
     * dupliquée. Ici elle est nommée et validable.
     *
     * {@code reference} est nulle si et seulement si le niveau est
     * {@code CRITERE} — une règle de portée critère ne reçoit jamais une
     * référence de preuve par commodité.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Portee(
            @JsonProperty("niveau") String niveau,
            @JsonProperty("reference") String reference
    ) {
        public static final String CRITERE = "CRITERE";
        public static final String EXIGENCE = "EXIGENCE";
        public static final String PREUVE_ATTENDUE = "PREUVE_ATTENDUE";

        public static Portee surLeCritere() {
            return new Portee(CRITERE, null);
        }

        public static Portee surExigence(String codeExigence) {
            return new Portee(EXIGENCE, codeExigence);
        }

        public static Portee surPreuveAttendue(String referencePreuve) {
            return new Portee(PREUVE_ATTENDUE, referencePreuve);
        }
    }

    /**
     * Ce que l'organisation affirme, sans preuve.
     *
     * Scénario et réponses réunis : ce sont deux formes d'une même chose, et
     * le prompt les traite déjà comme un couple d'affirmations non vérifiées.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Declaration(
            @JsonProperty("scenario") String scenario,
            @JsonProperty("reponses") List<Reponse> reponses
    ) {
    }

    /**
     * {@code valeur} porte le libellé complet — « 3 — Défini » — pour que le
     * modèle dispose de l'intitulé et non d'un rang isolé. {@code niveau}
     * l'accompagne sans le remplacer : il est exploitable sans réanalyser une
     * chaîne, et reste nul pour les réponses fermées d'avant V26.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Reponse(
            @JsonProperty("question") String question,
            @JsonProperty("valeur") String valeur,
            @JsonProperty("niveau") Integer niveau,
            @JsonProperty("commentaire") String commentaire
    ) {
    }

    /**
     * Ce que l'organisation a réellement déposé.
     *
     * {@code preuve_attendue_reference} est le point d'extension prévu pour le
     * rattachement d'une pièce à la preuve attendue qu'elle vise : toujours
     * nul aujourd'hui, il évitera de rouvrir le contrat quand le modèle de
     * données portera l'information.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Piece(
            @JsonProperty("reference") String reference,
            @JsonProperty("nom") String nom,
            @JsonProperty("type_mime") String typeMime,
            @JsonProperty("taille") long taille,
            @JsonProperty("contenu_base64") String contenuBase64,
            @JsonProperty("preuve_attendue_reference") String preuveAttendueReference
    ) {
    }

    /**
     * Le seul contexte d'entreprise transmis — et à deux agents seulement.
     *
     * Ni raison sociale, ni taille, ni effectif, ni chiffre d'affaires :
     * nommer l'entreprise exposerait le modèle à ce qu'il croit savoir d'elle.
     */
    public record Organisation(
            @JsonProperty("secteur") String secteur
    ) {
    }

    /**
     * Ce que le service doit faire, non ce qu'il doit comprendre.
     *
     * Le code de formule n'est pas transmis : le service d'agents ne connaît
     * pas la notion d'abonnement, et n'a aucune raison d'en dépendre.
     */
    public record Options(
            @JsonProperty("analyse_risque") boolean analyseRisque,
            @JsonProperty("generer_recommandation") boolean genererRecommandation
    ) {
    }
}
