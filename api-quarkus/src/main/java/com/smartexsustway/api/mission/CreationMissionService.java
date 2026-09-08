package com.smartexsustway.api.mission;

import com.smartexsustway.api.domain.entity.Abonnement;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.AuditQuestion;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Criticite;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Question;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditQuestionRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.QuestionRepository;
import com.smartexsustway.api.referentiel.QuestionnaireService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Création d'une mission d'audit et composition de son questionnaire.
 *
 * Extrait d'AuditResource pour que la création groupée d'un projet suive
 * exactement le même chemin : dupliquer la composition ferait diverger les
 * deux à la première évolution des règles RG34/RG35.
 */
@ApplicationScoped
public class CreationMissionService {

    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject AuditQuestionRepository auditQuestionRepository;
    @Inject QuestionRepository questionRepository;
    @Inject QuestionnaireService questionnaireService;

    /** Mission créée, avec le nombre de critères que porte son questionnaire. */
    public record MissionCreee(Audit audit, int nombreCriteres) {
    }

    /**
     * Crée la mission puis fige son questionnaire.
     *
     * RG34/RG35 : le questionnaire est composé dynamiquement à partir du
     * profil de l'entreprise, puis figé dans la mission — la faire évoluer
     * ensuite ne doit rien réécrire.
     *
     * La version du référentiel est figée avec la mission : ce qu'elle a
     * audité reste déterminé même si le catalogue publie une version
     * suivante, et le contenu de cette version est immuable (V49).
     *
     * RG37 : la criticité et le coefficient de pondération de chaque critère
     * sont résolus pour le secteur de l'entreprise auditée avant d'être
     * gelés — un critère peut compter davantage dans la note d'une mine que
     * dans celle d'une société de services.
     */
    public MissionCreee creer(Entreprise entreprise, ReferentielVersion version, String nom,
                              LocalDate dateDebut, LocalDate dateFin, String description,
                              Abonnement abonnement, Utilisateur auteur) {
        Audit audit = new Audit(entreprise, version, nom, dateDebut);
        audit.setDescription(description);
        audit.setDateFin(dateFin);
        if (abonnement != null) {
            audit.setFormuleAbonnement(abonnement.getFormule());
        }
        audit.setCreatedBy(auteur);
        auditRepository.persist(audit);

        List<Critere> criteres = questionnaireService.composer(entreprise, version);
        for (Critere critere : criteres) {
            Criticite criticiteEffective = questionnaireService.criticiteEffective(critere, entreprise);
            BigDecimal coefficientEffectif = questionnaireService.coefficientEffectif(critere, entreprise);
            AuditCritere auditCritere =
                    new AuditCritere(audit, critere, criticiteEffective, coefficientEffectif);
            auditCritereRepository.persist(auditCritere);

            for (Question question : questionRepository.parCritere(critere.getId())) {
                auditQuestionRepository.persist(new AuditQuestion(auditCritere, question));
            }
        }

        return new MissionCreee(audit, criteres.size());
    }
}
