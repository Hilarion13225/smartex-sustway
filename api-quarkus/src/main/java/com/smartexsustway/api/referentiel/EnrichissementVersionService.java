package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.enums.NiveauCriticite;
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.enums.TypePreuveAttendue;
import com.smartexsustway.api.domain.enums.TypeRegleAnalyse;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.domain.repository.RegleAnalyseRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Applique une proposition d'enrichissement à un brouillon dérivé d'une
 * version publiée.
 *
 * Ce service ne crée ni domaine, ni sous-domaine, ni critère, ni exigence : le
 * brouillon les tient déjà de la version qu'il remplace, recopiés par
 * {@link VersionReferentielService}. Il n'écrit que ce que la proposition
 * ajoute — une description sur un critère existant, des preuves attendues, des
 * règles d'analyse.
 *
 * Tout ce qu'il écrit porte {@code origine = origine_initiale = IMPORT_IA},
 * posé explicitement. S'en remettre au défaut de la colonne — qui vaut
 * {@code CONTENU_HUMAIN} — laisserait passer du contenu proposé par une
 * machine pour du contenu rédigé, et la barrière de publication ne le
 * retiendrait pas : elle ne regarde que {@code IMPORT_IA}. Un oubli ici ne
 * lèverait aucune erreur, et c'est précisément ce qui le rend dangereux.
 *
 * Aucune génération n'a lieu pendant l'enrichissement : la proposition est un
 * fichier déjà produit, relu et arbitré. L'import est local et déterministe.
 */
@ApplicationScoped
public class EnrichissementVersionService {

    @Inject CritereRepository critereRepository;
    @Inject ExigenceRepository exigenceRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject RegleAnalyseRepository regleAnalyseRepository;

    /** Ce que l'enrichissement a écrit, pour que l'appelant puisse en rendre compte. */
    public record Compte(int descriptions, int preuves, int regles, int criteresSansRegle) {
    }

    /**
     * Une proposition que le contenu de la version ne permet pas d'appliquer.
     *
     * Toujours fatale : elle annule la transaction entière. Un enrichissement
     * à moitié appliqué laisserait un brouillon dont personne ne pourrait dire
     * ce qu'il contient.
     */
    public static class EnrichissementRefuseException extends RuntimeException {
        public EnrichissementRefuseException(String message) {
            super(message);
        }
    }

    public Compte appliquer(ReferentielVersion brouillon, Proposition22Dto proposition) {
        Map<String, Critere> criteres = indexerParCode(brouillon);
        exigerAucunEnrichissementAnterieur(brouillon);

        int descriptions = 0;
        int preuves = 0;
        int regles = 0;
        int sansRegle = 0;

        for (var dto : proposition.criteres()) {
            Critere critere = criteres.get(dto.code());
            if (critere == null) {
                throw new EnrichissementRefuseException(
                        "Le critère " + dto.code() + " de la proposition est absent de la version "
                                + brouillon.getNumero());
            }

            if (appliquerDescription(critere, dto)) {
                descriptions++;
            }
            if (dto.preuveComplementaire() != null) {
                deposerPreuve(critere, dto.preuveComplementaire());
                preuves++;
            }
            int posees = deposerRegles(critere, dto.reglesProposees());
            regles += posees;
            if (posees == 0 && aDesReglesProposees(dto)) {
                sansRegle++;
            }
        }
        return new Compte(descriptions, preuves, regles, sansRegle);
    }

    // --- Critères et descriptions -------------------------------------------

    /**
     * Pose la description proposée, et fait basculer la ligne en proposition.
     *
     * L'unité de décision est le critère, non le champ : accepter ce critère
     * acceptera du même geste son libellé, son applicabilité, son coefficient
     * et sa criticité — qui sont ceux de la version précédente, déjà validés.
     * C'est la contrepartie du modèle posé par V75, et elle est assumée : la
     * description est la seule de ces valeurs que la proposition modifie.
     */
    private boolean appliquerDescription(Critere critere, Proposition22Dto.CritereDto dto) {
        if (dto.description() == null || estVide(dto.description().valeur())) {
            return false;
        }
        critere.setDescription(dto.description().valeur());
        critere.setOrigine(OrigineContenu.IMPORT_IA);
        critere.setOrigineInitiale(OrigineContenu.IMPORT_IA);
        return true;
    }

    // --- Preuves complémentaires --------------------------------------------

    private void deposerPreuve(Critere critere, Proposition22Dto.PreuveComplementaireDto dto) {
        List<Exigence> exigences = exigenceRepository.parCritere(critere.getId());
        if (exigences.isEmpty()) {
            throw new EnrichissementRefuseException(
                    "Le critère " + critere.getCode() + " ne porte aucune exigence : "
                            + "la preuve « " + dto.libelle() + " » n'a rien à quoi se rattacher");
        }
        if (exigences.size() > 1) {
            // Rattacher à la première serait un choix arbitraire, et il serait
            // invisible. Mieux vaut refuser et faire préciser la cible.
            throw new EnrichissementRefuseException(
                    "Le critère " + critere.getCode() + " porte " + exigences.size()
                            + " exigences : la preuve « " + dto.libelle()
                            + " » ne peut être rattachée sans ambiguïté");
        }
        Exigence exigence = exigences.get(0);

        boolean deja = preuveAttendueRepository.parExigence(exigence.getId()).stream()
                .anyMatch(p -> p.getLibelle().equalsIgnoreCase(dto.libelle()));
        if (deja) {
            throw new EnrichissementRefuseException(
                    "Une preuve « " + dto.libelle() + " » existe déjà sur le critère "
                            + critere.getCode());
        }

        var preuve = new PreuveAttendue(exigence,
                enumOu(TypePreuveAttendue.class, dto.type(), TypePreuveAttendue.AUTRE, "type de preuve"),
                exigerTexte(dto.libelle(), "libellé de la preuve complémentaire"));
        preuve.setDescription(dto.description());
        // Une preuve déduite ne peut pas être imposée : personne n'a décidé
        // qu'elle était indispensable, et la rendre obligatoire durcirait
        // l'exigence pour toutes les organisations auditées.
        preuve.setObligatoire(Boolean.TRUE.equals(dto.obligatoire()));
        preuve.setOrdre(prochainOrdrePreuve(exigence));
        preuve.setOrigine(OrigineContenu.IMPORT_IA);
        preuve.setOrigineInitiale(OrigineContenu.IMPORT_IA);
        preuve.setConfiance(confiance(dto.confiance()));
        preuveAttendueRepository.persist(preuve);
    }

    private int prochainOrdrePreuve(Exigence exigence) {
        return preuveAttendueRepository.parExigence(exigence.getId()).stream()
                .mapToInt(PreuveAttendue::getOrdre).max().orElse(0) + 1;
    }

    // --- Règles --------------------------------------------------------------

    private int deposerRegles(Critere critere, List<Proposition22Dto.RegleDto> dtos) {
        if (dtos == null) {
            return 0;
        }
        int posees = 0;
        for (var dto : dtos) {
            // Une entrée qui n'est pas proposée dit qu'aucune règle n'a pu être
            // déduite pour ce critère. C'est un constat, pas une erreur, et la
            // décision H-03 veut qu'il soit respecté : on n'écrit rien.
            if (!dto.estProposee()) {
                continue;
            }
            deposerRegle(critere, dto);
            posees++;
        }
        return posees;
    }

    private void deposerRegle(Critere critere, Proposition22Dto.RegleDto dto) {
        String code = critere.getCode() + "-" + exigerTexte(dto.suffixe(), "suffixe de la règle");
        if (regleAnalyseRepository.parCritereEtCode(critere.getId(), code).isPresent()) {
            throw new EnrichissementRefuseException(
                    "Une règle porte déjà le code " + code + " sur le critère " + critere.getCode());
        }

        TypeRegleAnalyse type = enumOu(TypeRegleAnalyse.class, dto.type(), null, "type de règle");
        if (type == null) {
            throw new EnrichissementRefuseException(
                    "La règle " + code + " ne précise pas son type");
        }
        // La définition est recopiée dans une carte neuve. Partager celle du
        // document ferait dépendre deux lignes d'un même objet, et une
        // modification de l'une toucherait l'autre.
        Map<String, Object> definition = dto.definition() == null
                ? Map.of() : new LinkedHashMap<>(dto.definition());
        RegleAnalyseValidation.verifier(type, definition);

        PreuveAttendue cible = resoudrePreuve(critere, dto, code);

        var regle = new RegleAnalyse(critere, code, type,
                exigerTexte(dto.libelle(), "libellé de la règle " + code));
        // L'exigence se déduit de la pièce visée, jamais l'inverse : la base
        // refuse une règle qui nomme une preuve sans nommer son exigence
        // (regle_analyse_portee_coherente).
        regle.setExigence(cible.getExigence());
        regle.setPreuveAttendue(cible);
        regle.setSeverite(enumOu(NiveauCriticite.class, dto.severite(),
                NiveauCriticite.MOYENNE, "sévérité de la règle " + code));
        regle.setDefinition(definition);
        regle.setOrdre(prochainOrdreRegle(critere));
        regle.setOrigine(OrigineContenu.IMPORT_IA);
        regle.setOrigineInitiale(OrigineContenu.IMPORT_IA);
        regle.setConfiance(confiance(dto.confiance()));
        regleAnalyseRepository.persist(regle);
    }

    /**
     * Retrouve la pièce visée par une règle, par son libellé sous ce critère.
     *
     * Le libellé est la seule clé métier disponible : une preuve attendue n'a
     * pas de code. Il est cherché sous le critère, et non dans toute la
     * version — quatre libellés du catalogue sont portés par deux critères
     * chacun, « Acte de désignation » entre autres, et une recherche globale
     * rattacherait deux règles à la même pièce.
     *
     * L'index de tableau du fichier de proposition n'est pas utilisé : il
     * dépend d'un ordre que rien ne garantit entre le fichier source et la
     * base, et un rapprochement positionnel faux ne lèverait aucune erreur.
     */
    private PreuveAttendue resoudrePreuve(Critere critere, Proposition22Dto.RegleDto dto, String code) {
        String libelle = dto.porteePreuveLibelle();
        if (estVide(libelle)) {
            throw new EnrichissementRefuseException(
                    "La règle " + code + " ne désigne pas la pièce sur laquelle elle porte : "
                            + "« portee_preuve_libelle » est obligatoire, un index de tableau "
                            + "n'identifie pas une preuve");
        }
        List<PreuveAttendue> candidates = preuveAttendueRepository.parCritere(critere.getId()).stream()
                .filter(p -> p.getLibelle().equalsIgnoreCase(libelle))
                .toList();
        if (candidates.isEmpty()) {
            throw new EnrichissementRefuseException(
                    "La règle " + code + " vise la pièce « " + libelle
                            + " », absente du critère " + critere.getCode());
        }
        if (candidates.size() > 1) {
            throw new EnrichissementRefuseException(
                    "La règle " + code + " vise la pièce « " + libelle + " », portée "
                            + candidates.size() + " fois par le critère " + critere.getCode()
                            + " : la correspondance est ambiguë");
        }
        return candidates.get(0);
    }

    private int prochainOrdreRegle(Critere critere) {
        return regleAnalyseRepository.parCritere(critere.getId()).stream()
                .mapToInt(RegleAnalyse::getOrdre).max().orElse(0) + 1;
    }

    // --- Garde-fous ----------------------------------------------------------

    /**
     * Refuse d'enrichir un brouillon qui porte déjà du contenu proposé.
     *
     * Le verrou de brouillon unique empêche qu'une seconde version s'ouvre,
     * mais rien n'empêcherait d'appliquer deux fois la même proposition au
     * même brouillon — et {@code preuve_attendue} n'a aucune contrainte
     * d'unicité qui s'y opposerait : les treize preuves complémentaires
     * seraient créées une seconde fois.
     */
    private void exigerAucunEnrichissementAnterieur(ReferentielVersion brouillon) {
        long deja = critereRepository.compterImportes(brouillon.getId())
                + preuveAttendueRepository.compterImportes(brouillon.getId())
                + regleAnalyseRepository.compterImportes(brouillon.getId());
        if (deja > 0) {
            throw new EnrichissementRefuseException(
                    "La version " + brouillon.getNumero() + " porte déjà " + deja
                            + " élément(s) issus d'un import : un second enrichissement "
                            + "créerait des doublons");
        }
    }

    private Map<String, Critere> indexerParCode(ReferentielVersion brouillon) {
        var parCode = new HashMap<String, Critere>();
        for (Critere critere : critereRepository.parVersion(brouillon.getId())) {
            parCode.put(critere.getCode(), critere);
        }
        return parCode;
    }

    private static boolean aDesReglesProposees(Proposition22Dto.CritereDto dto) {
        return dto.reglesProposees() != null && !dto.reglesProposees().isEmpty();
    }

    private static boolean estVide(String valeur) {
        return valeur == null || valeur.isBlank();
    }

    private static String exigerTexte(String valeur, String quoi) {
        if (estVide(valeur)) {
            throw new EnrichissementRefuseException("Le " + quoi + " doit être renseigné");
        }
        return valeur.trim();
    }

    private static BigDecimal confiance(Double valeur) {
        return valeur == null ? null : BigDecimal.valueOf(valeur);
    }

    private static <E extends Enum<E>> E enumOu(Class<E> type, String valeur, E defaut, String quoi) {
        if (estVide(valeur)) {
            return defaut;
        }
        try {
            return Enum.valueOf(type, valeur.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new EnrichissementRefuseException(
                    "Valeur inconnue pour le " + quoi + " : « " + valeur + " »");
        }
    }
}
