package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Domaine;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.Question;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.entity.SousDomaine;
import com.smartexsustway.api.domain.enums.NiveauCriticite;
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.enums.TypeApplicabilite;
import com.smartexsustway.api.domain.enums.TypePreuveAttendue;
import com.smartexsustway.api.domain.enums.TypeQuestion;
import com.smartexsustway.api.domain.enums.TypeRegleAnalyse;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.CriticiteRepository;
import com.smartexsustway.api.domain.repository.DomaineRepository;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.domain.repository.QuestionRepository;
import com.smartexsustway.api.domain.repository.RegleAnalyseRepository;
import com.smartexsustway.api.domain.repository.SousDomaineRepository;
import com.smartexsustway.api.ia.ExtractionReferentielResponseDto;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Dépose dans un brouillon la structure proposée par le service d'agents.
 *
 * Tout ce qui est écrit ici porte {@code origine = IMPORT_IA} et
 * {@code origine_initiale = IMPORT_IA}, sans validateur : c'est une
 * proposition, et le déclencheur de V57 refusera la publication de la version
 * tant qu'une personne ne l'aura pas acceptée élément par élément.
 *
 * L'écriture est faite d'un seul tenant. Un contenu à moitié inséré — trois
 * domaines, quatre critères, puis une erreur — laisserait un brouillon dont
 * personne ne pourrait dire ce qu'il contient au juste, ni s'il faut le
 * compléter ou le reprendre. Mieux vaut un import en échec, dont le fichier
 * source reste relisible.
 *
 * La proposition est revalidée ici bien qu'elle l'ait déjà été côté Python.
 * Ce n'est pas de la défiance envers ce service : c'est que Java est le
 * dernier à écrire, et que les contraintes qu'il doit respecter — énumérations
 * PostgreSQL, unicité, portées, immuabilité — sont les siennes.
 */
@ApplicationScoped
public class BrouillonImporteService {

    private static final Logger LOG = Logger.getLogger(BrouillonImporteService.class);

    @Inject DomaineRepository domaineRepository;
    @Inject SousDomaineRepository sousDomaineRepository;
    @Inject CritereRepository critereRepository;
    @Inject QuestionRepository questionRepository;
    @Inject ExigenceRepository exigenceRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject RegleAnalyseRepository regleAnalyseRepository;
    @Inject CriticiteRepository criticiteRepository;

    /** Le contenu proposé n'est pas insérable. L'import passera en échec. */
    public static class ContenuRefuseException extends RuntimeException {
        public ContenuRefuseException(String message) {
            super(message);
        }
    }

    /**
     * Écrit la proposition dans le brouillon, ou n'écrit rien.
     *
     * Une seule transaction couvre toute la descente : la moindre incohérence
     * lève, et l'annulation emporte l'ensemble.
     */
    @Transactional
    public Map<String, Integer> deposer(ReferentielVersion brouillon,
                                        ExtractionReferentielResponseDto.BrouillonDto propose) {
        versionModifiable(brouillon);
        if (propose == null || propose.domaines() == null || propose.domaines().isEmpty()) {
            throw new ContenuRefuseException("La proposition ne contient aucun domaine");
        }

        var compte = new HashMap<String, Integer>();
        compte.put("domaines", 0);
        compte.put("sous_domaines", 0);
        compte.put("criteres", 0);
        compte.put("questions", 0);
        compte.put("exigences", 0);
        compte.put("preuves_attendues", 0);
        compte.put("regles_analyse", 0);

        for (var domaineDto : propose.domaines()) {
            Domaine domaine = deposerDomaine(brouillon, domaineDto, compte);
            var sousDomaines = deposerSousDomaines(domaine, domaineDto, compte);
            for (var critereDto : nonNul(domaineDto.criteres())) {
                deposerCritere(domaine, sousDomaines, critereDto, compte);
            }
        }

        LOG.infof("Brouillon %s : proposition déposée — %s", brouillon.getNumero(), compte);
        return compte;
    }

    private void versionModifiable(ReferentielVersion brouillon) {
        if (brouillon == null || !brouillon.estBrouillon()) {
            // Cette vérification double celle de la base. Elle sert à rendre un
            // motif lisible plutôt qu'une erreur SQL, la base restant l'autorité.
            throw new ContenuRefuseException(
                    "Le contenu importé ne peut être déposé que dans une version brouillon");
        }
    }

    private Domaine deposerDomaine(ReferentielVersion brouillon,
                                   ExtractionReferentielResponseDto.DomaineDto dto,
                                   Map<String, Integer> compte) {
        exigerCode(dto.code(), "domaine");
        if (domaineRepository.parVersionEtCode(brouillon.getId(), dto.code()).isPresent()) {
            throw new ContenuRefuseException(
                    "Un domaine porte déjà le code " + dto.code() + " dans ce brouillon");
        }
        Domaine domaine = new Domaine(brouillon, dto.code(), tronquer(dto.nom(), 200, "domaine " + dto.code()));
        domaine.setDescription(dto.description());
        domaine.setOrdre(dto.ordre());
        domaineRepository.persist(domaine);
        compte.merge("domaines", 1, Integer::sum);
        return domaine;
    }

    private Map<String, SousDomaine> deposerSousDomaines(Domaine domaine,
                                                         ExtractionReferentielResponseDto.DomaineDto dto,
                                                         Map<String, Integer> compte) {
        var parCode = new HashMap<String, SousDomaine>();
        for (var sdDto : nonNul(dto.sousDomaines())) {
            exigerCode(sdDto.code(), "sous-domaine");
            if (parCode.containsKey(sdDto.code())) {
                throw new ContenuRefuseException(
                        "Deux sous-domaines portent le code " + sdDto.code()
                                + " dans le domaine " + dto.code());
            }
            var sousDomaine = new SousDomaine(domaine, sdDto.code(),
                    tronquer(sdDto.nom(), 300, "sous-domaine " + sdDto.code()), sdDto.ordre());
            sousDomaine.setDescription(sdDto.description());
            sousDomaineRepository.persist(sousDomaine);
            parCode.put(sdDto.code(), sousDomaine);
            compte.merge("sous_domaines", 1, Integer::sum);
        }
        return parCode;
    }

    private void deposerCritere(Domaine domaine, Map<String, SousDomaine> sousDomaines,
                                ExtractionReferentielResponseDto.CritereDto dto,
                                Map<String, Integer> compte) {
        exigerCode(dto.code(), "critère");
        if (critereRepository.parDomaineEtCode(domaine.getId(), dto.code()).isPresent()) {
            throw new ContenuRefuseException(
                    "Un critère porte déjà le code " + dto.code() + " dans le domaine "
                            + domaine.getCode());
        }

        Critere critere = new Critere(domaine, dto.code(),
                tronquer(dto.libelle(), 500, "critère " + dto.code()));
        critere.setDescription(dto.description());
        critere.setApplicabilite(enumOu(TypeApplicabilite.class, dto.applicabilite(),
                TypeApplicabilite.GENERALE, "applicabilité"));
        critere.setCoefficientPonderation(coefficient(dto.coefficientPonderation()));

        if (dto.sousDomaineCode() != null) {
            SousDomaine sousDomaine = sousDomaines.get(dto.sousDomaineCode());
            if (sousDomaine == null) {
                throw new ContenuRefuseException(
                        "Le critère " + dto.code() + " se rattache au sous-domaine "
                                + dto.sousDomaineCode() + ", absent du domaine " + domaine.getCode());
            }
            critere.setSousDomaine(sousDomaine);
        }
        if (dto.criticite() != null) {
            var niveau = enumOu(NiveauCriticite.class, dto.criticite(), null, "criticité");
            criticiteRepository.parCode(niveau).ifPresent(critere::setCriticite);
        }
        critereRepository.persist(critere);
        compte.merge("criteres", 1, Integer::sum);

        for (var questionDto : nonNul(dto.questions())) {
            deposerQuestion(critere, questionDto, compte);
        }

        var exigences = new HashMap<String, Exigence>();
        var preuvesParExigence = new HashMap<String, Map<String, PreuveAttendue>>();
        int rang = 0;
        for (var exigenceDto : nonNul(dto.exigences())) {
            rang++;
            String code = exigenceDto.code() == null || exigenceDto.code().isBlank()
                    ? dto.code() + "-E" + rang
                    : exigenceDto.code();
            Exigence exigence = deposerExigence(critere, code, exigenceDto, compte);
            exigences.put(code, exigence);
            preuvesParExigence.put(code, deposerPreuves(exigence, exigenceDto, compte));
        }

        for (var regleDto : nonNul(dto.reglesAnalyse())) {
            deposerRegle(critere, exigences, preuvesParExigence, regleDto, compte);
        }
    }

    private void deposerQuestion(Critere critere,
                                 ExtractionReferentielResponseDto.QuestionDto dto,
                                 Map<String, Integer> compte) {
        String code = dto.code() == null || dto.code().isBlank()
                ? critere.getCode() + "-Q" + (compte.get("questions") + 1)
                : dto.code();
        var question = new Question(critere, code, exigerTexte(dto.libelle(), "libellé de question"));
        question.setType(enumOu(TypeQuestion.class, dto.type(), TypeQuestion.FERMEE, "type de question"));
        question.setEchelleReponse(echelle(dto.echelleReponse()));
        question.setObligatoire(dto.obligatoire() == null || dto.obligatoire());
        question.setOrdre(dto.ordre());
        questionRepository.persist(question);
        compte.merge("questions", 1, Integer::sum);
    }

    private Exigence deposerExigence(Critere critere, String code,
                                     ExtractionReferentielResponseDto.ExigenceDto dto,
                                     Map<String, Integer> compte) {
        var exigence = new Exigence(critere, code,
                tronquer(dto.intitule(), 300, "exigence " + code),
                exigerTexte(dto.enonce(), "énoncé de l'exigence " + code));
        exigence.setOrdre(dto.ordre());
        // Proposition, pas contenu rédigé : la marque et sa trace initiale sont
        // posées ici, et aucun validateur n'est renseigné.
        exigence.setOrigine(OrigineContenu.IMPORT_IA);
        exigence.setOrigineInitiale(OrigineContenu.IMPORT_IA);
        conserverSource(dto.localisation(), dto.texteSource(), dto.confiance(),
                exigence::setLocalisation, exigence::setTexteSource, exigence::setConfiance);
        exigenceRepository.persist(exigence);
        compte.merge("exigences", 1, Integer::sum);
        return exigence;
    }

    private Map<String, PreuveAttendue> deposerPreuves(Exigence exigence,
                                                        ExtractionReferentielResponseDto.ExigenceDto dto,
                                                        Map<String, Integer> compte) {
        var parLibelle = new HashMap<String, PreuveAttendue>();
        for (var preuveDto : nonNul(dto.preuvesAttendues())) {
            String libelle = tronquer(preuveDto.libelle(), 300, "preuve attendue");
            var preuve = new PreuveAttendue(exigence,
                    enumOu(TypePreuveAttendue.class, preuveDto.type(), TypePreuveAttendue.AUTRE,
                            "type de preuve attendue"),
                    libelle);
            preuve.setDescription(preuveDto.description());
            preuve.setObligatoire(preuveDto.obligatoire() == null || preuveDto.obligatoire());
            preuve.setOrdre(preuveDto.ordre());
            preuve.setOrigine(OrigineContenu.IMPORT_IA);
            preuve.setOrigineInitiale(OrigineContenu.IMPORT_IA);
            conserverSource(preuveDto.localisation(), preuveDto.texteSource(), preuveDto.confiance(),
                    preuve::setLocalisation, preuve::setTexteSource, preuve::setConfiance);
            preuveAttendueRepository.persist(preuve);
            parLibelle.put(libelle, preuve);
            compte.merge("preuves_attendues", 1, Integer::sum);
        }
        return parLibelle;
    }

    private void deposerRegle(Critere critere, Map<String, Exigence> exigences,
                              Map<String, Map<String, PreuveAttendue>> preuves,
                              ExtractionReferentielResponseDto.RegleDto dto,
                              Map<String, Integer> compte) {
        exigerCode(dto.code(), "règle d'analyse");
        var type = enumOu(TypeRegleAnalyse.class, dto.type(), null, "type de règle");

        Map<String, Object> definition = dto.definition() == null ? Map.of() : dto.definition();
        try {
            // Même validateur que l'écran d'administration : deux contrôles
            // divergents finiraient par accepter d'un côté ce que l'autre refuse.
            RegleAnalyseValidation.verifier(type, definition);
        } catch (RegleAnalyseValidation.DefinitionInvalideException e) {
            throw new ContenuRefuseException(
                    "Règle " + dto.code() + " du critère " + critere.getCode() + " : " + e.getMessage());
        }

        Exigence exigence = null;
        PreuveAttendue preuve = null;
        if (dto.exigenceCode() != null) {
            exigence = exigences.get(dto.exigenceCode());
            if (exigence == null) {
                throw new ContenuRefuseException(
                        "La règle " + dto.code() + " vise l'exigence " + dto.exigenceCode()
                                + ", absente du critère " + critere.getCode());
            }
        }
        if (dto.preuveAttendueLibelle() != null) {
            if (exigence == null) {
                throw new ContenuRefuseException(
                        "La règle " + dto.code() + " vise une preuve attendue sans nommer son exigence");
            }
            preuve = preuves.getOrDefault(dto.exigenceCode(), Map.of())
                    .get(dto.preuveAttendueLibelle());
            if (preuve == null) {
                throw new ContenuRefuseException(
                        "La règle " + dto.code() + " vise une preuve attendue absente de l'exigence "
                                + dto.exigenceCode());
            }
        }

        var regle = new RegleAnalyse(critere, dto.code(), type,
                tronquer(dto.libelle(), 300, "règle " + dto.code()));
        regle.setExigence(exigence);
        regle.setPreuveAttendue(preuve);
        regle.setDefinition(definition);
        regle.setSeverite(enumOu(NiveauCriticite.class, dto.severite(), NiveauCriticite.MOYENNE,
                "sévérité"));
        regle.setOrigine(OrigineContenu.IMPORT_IA);
        regle.setOrigineInitiale(OrigineContenu.IMPORT_IA);
        conserverSource(dto.localisation(), dto.texteSource(), dto.confiance(),
                regle::setLocalisation, regle::setTexteSource, regle::setConfiance);
        regleAnalyseRepository.persist(regle);
        compte.merge("regles_analyse", 1, Integer::sum);
    }


    /**
     * Conserve ce que l'extraction a mesuré de la source, et rien d'autre.
     *
     * Une absence reste une absence : un texte manquant ne devient pas une
     * chaîne vide, une localisation manquante n'est pas estimée, et une
     * confiance manquante ne devient pas zéro — l'ignorance n'est pas une
     * certitude négative. Une confiance hors de [0, 1] est écartée plutôt que
     * ramenée aux bornes : elle signale une sortie que le contrat aurait dû
     * refuser, et la corriger en silence masquerait le problème.
     */
    private static void conserverSource(Map<String, Object> localisation, String texteSource,
                                        Double confiance,
                                        Consumer<Map<String, Object>> poserLocalisation,
                                        Consumer<String> poserTexte,
                                        Consumer<BigDecimal> poserConfiance) {
        if (localisation != null && !localisation.isEmpty()) {
            poserLocalisation.accept(localisation);
        }
        if (texteSource != null && !texteSource.isBlank()) {
            poserTexte.accept(texteSource);
        }
        if (confiance != null && confiance >= 0 && confiance <= 1) {
            poserConfiance.accept(BigDecimal.valueOf(confiance));
        }
    }

    // --- Contrôles ------------------------------------------------------

    private static <T> List<T> nonNul(List<T> liste) {
        return liste == null ? List.of() : liste;
    }

    private static void exigerCode(String code, String quoi) {
        if (code == null || code.isBlank()) {
            throw new ContenuRefuseException("Un " + quoi + " est proposé sans code");
        }
    }

    private static String exigerTexte(String texte, String quoi) {
        if (texte == null || texte.isBlank()) {
            throw new ContenuRefuseException("Le " + quoi + " est vide");
        }
        return texte;
    }

    /**
     * Refuse plutôt que de couper.
     *
     * Tronquer un libellé trop long en ferait un texte différent de la source,
     * qu'un relecteur validerait sans voir ce qui manque. Le nom de la méthode
     * dit ce que la base attend ; le comportement dit ce qui est juste.
     */
    private static String tronquer(String texte, int maximum, String quoi) {
        String valeur = exigerTexte(texte, quoi);
        if (valeur.length() > maximum) {
            throw new ContenuRefuseException(
                    "Le texte du " + quoi + " dépasse " + maximum + " caractères ("
                            + valeur.length() + ")");
        }
        return valeur;
    }

    /**
     * L'échelle de réponse n'est pas une énumération PostgreSQL mais une
     * chaîne sous contrainte {@code CHECK} (V27). Le contrôle est donc écrit
     * ici, à défaut de pouvoir s'appuyer sur un type.
     */
    private static String echelle(String valeur) {
        if (valeur == null || valeur.isBlank()) {
            return "MATURITE";
        }
        if (!valeur.equals("MATURITE") && !valeur.equals("BINAIRE")) {
            throw new ContenuRefuseException(
                    "L'échelle de réponse « " + valeur + " » n'est pas reconnue");
        }
        return valeur;
    }

    private static <E extends Enum<E>> E enumOu(Class<E> type, String valeur, E defaut, String quoi) {
        if (valeur == null || valeur.isBlank()) {
            if (defaut == null) {
                throw new ContenuRefuseException("Le " + quoi + " est absent");
            }
            return defaut;
        }
        try {
            return Enum.valueOf(type, valeur);
        } catch (IllegalArgumentException e) {
            throw new ContenuRefuseException("Le " + quoi + " « " + valeur + " » n'est pas reconnu");
        }
    }

    private static BigDecimal coefficient(Double valeur) {
        BigDecimal coefficient = valeur == null ? BigDecimal.ONE : BigDecimal.valueOf(valeur);
        if (coefficient.compareTo(BigDecimal.ONE) < 0
                || coefficient.compareTo(BigDecimal.valueOf(3)) > 0) {
            throw new ContenuRefuseException(
                    "Le coefficient de pondération " + coefficient + " sort de l'intervalle attendu (1 à 3)");
        }
        return coefficient;
    }
}
