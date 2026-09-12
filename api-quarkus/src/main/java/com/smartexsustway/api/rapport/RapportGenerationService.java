package com.smartexsustway.api.rapport;

import com.smartexsustway.api.domain.entity.ActionCorrective;
import com.smartexsustway.api.domain.entity.ActionPlan;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AxeAmelioration;
import com.smartexsustway.api.domain.entity.PlanAction;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Bailleur;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.IndicePreparation;
import com.smartexsustway.api.domain.entity.NonConforme;
import com.smartexsustway.api.domain.entity.Site;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.FormatRapport;
import com.smartexsustway.api.domain.repository.ActionCorrectiveRepository;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.planification.PlanActionService;
import com.smartexsustway.api.domain.repository.ActionPlanRepository;
import com.smartexsustway.api.domain.repository.AuditSiteRepository;
import com.smartexsustway.api.domain.repository.AxeAmeliorationRepository;
import com.smartexsustway.api.domain.repository.PlanActionRepository;
import com.smartexsustway.api.domain.repository.CritereBailleurRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.NonConformeRepository;
import com.smartexsustway.api.domain.repository.SiteRepository;
import com.smartexsustway.api.indice.IndicePreparationService;
import com.smartexsustway.api.resource.dto.AuditScoreDto;
import com.smartexsustway.api.scoring.AuditScoreService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.openpdf.text.Chunk;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.Rectangle;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Module 12 — génération des rapports d'une mission d'audit, aux formats
 * CSV et PDF. SYNTHESE et DETAILLE réutilisent AuditScoreService (même
 * calcul que le tableau de bord, RG32) : le rapport ne doit jamais afficher
 * un chiffre différent de l'écran. INDICE_FINANCEMENTS_VERTS recalcule
 * l'indice via IndicePreparationService pour la même raison (RG42).
 *
 * Le PDF reprend la palette de marque du frontend (components/charts.jsx —
 * COULEURS) : même vert (#128257) pour le score global, même code couleur
 * par niveau (vert/bleu/ambre/rouge) qu'à l'écran, pour qu'un rapport
 * exporté ne soit jamais visuellement en décalage avec l'application.
 */
@ApplicationScoped
public class RapportGenerationService {

    private static final DateTimeFormatter FORMAT_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // --- Palette (miroir de components/charts.jsx → COULEURS) --------------
    private static final Color BRAND = new Color(18, 130, 87);
    private static final Color BRAND_FONCE = new Color(11, 80, 54);
    private static final Color BRAND_CLAIR = new Color(232, 247, 240);
    private static final Color BLEU = new Color(37, 99, 235);
    private static final Color AMBRE = new Color(217, 119, 6);
    private static final Color ROUGE = new Color(225, 29, 72);
    private static final Color GRIS_CLAIR = new Color(247, 248, 250);
    private static final Color GRIS_BORDURE = new Color(228, 232, 238);
    private static final Color ENCRE = new Color(15, 23, 42);
    private static final Color ENCRE_ATTENUEE = new Color(100, 116, 139);
    private static final Color BLANC = Color.WHITE;

    @Inject AuditScoreService auditScoreService;
    @Inject NonConformeRepository nonConformeRepository;
    @Inject ActionCorrectiveRepository actionCorrectiveRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject CritereBailleurRepository critereBailleurRepository;
    @Inject IndicePreparationService indicePreparationService;
    @Inject AxeAmeliorationRepository axeAmeliorationRepository;
    @Inject PlanActionRepository planActionRepository;
    @Inject ActionPlanRepository actionPlanRepository;
    @Inject AuditSiteRepository auditSiteRepository;
    @Inject SiteRepository siteRepository;

    public byte[] genererSynthese(Audit audit, FormatRapport format) {
        AuditScoreDto score = auditScoreService.calculer(audit);
        List<NonConforme> nonConformites = nonConformeRepository.parAudit(audit.getId());

        return switch (format) {
            case CSV -> genererSyntheseCsv(audit, score, nonConformites);
            case PDF -> genererSynthesePdf(audit, score, nonConformites);
            case EXCEL -> throw new IllegalArgumentException("Format EXCEL non encore supporté pour le rapport de synthèse");
        };
    }

    /** Rapport de synthèse + détail de l'évaluation de chaque critère de l'audit (réservé au staff interne, permission rapport:detaille). */
    /**
     * Le rapport détaillé, dans la version que son destinataire a le droit de
     * lire.
     *
     * <p>{@code avecRaisonnementIa} n'est pas un paramètre d'affichage : il
     * décide de ce qui est <strong>écrit dans le fichier</strong>. Produire un
     * document complet puis en masquer des parties à l'écran laisserait les
     * justifications dans les octets déposés au stockage, donc dans tout
     * fichier téléchargé ensuite — ce ne serait pas une restriction, mais son
     * apparence.
     *
     * <p>Le responsable d'entreprise pilote les plans et doit pouvoir les
     * remettre ; le raisonnement interne de l'IA reste réservé à
     * {@code rapport:detaille}.
     */
    public byte[] genererDetaille(Audit audit, FormatRapport format, boolean avecRaisonnementIa) {
        AuditScoreDto score = auditScoreService.calculer(audit);
        List<AuditCritere> auditCriteres = auditCritereRepository.parAudit(audit.getId());

        return switch (format) {
            case CSV -> genererDetailleCsv(audit, score, auditCriteres, avecRaisonnementIa);
            case PDF -> genererDetaillePdf(audit, score, auditCriteres, avecRaisonnementIa);
            case EXCEL -> throw new IllegalArgumentException("Format EXCEL non encore supporté pour le rapport détaillé");
        };
    }

    /** RG18 : plan d'actions correctives transverse de la mission, une ligne par action (ou une ligne "aucune action" si une non-conformité n'en a pas encore). */
    public byte[] genererPlanAction(Audit audit, FormatRapport format) {
        List<NonConforme> nonConformites = nonConformeRepository.parAudit(audit.getId());

        return switch (format) {
            case CSV -> genererPlanActionCsv(audit, nonConformites);
            case PDF -> genererPlanActionPdf(audit, nonConformites);
            case EXCEL -> throw new IllegalArgumentException("Format EXCEL non encore supporté pour le plan d'actions");
        };
    }

    /**
     * RG39-RG43 : indice de préparation aux exigences du bailleur, recalculé
     * à la génération (comme SYNTHESE avec AuditScoreService) plutôt que lu
     * depuis une valeur potentiellement obsolète, plus le détail des
     * critères tagués applicables à ce bailleur.
     */
    public byte[] genererIndiceFinancementsVerts(Audit audit, Bailleur bailleur, FormatRapport format) {
        IndicePreparation indice = indicePreparationService.calculerEtEnregistrer(audit, bailleur);
        Set<UUID> critereIdsApplicables = Set.copyOf(critereBailleurRepository.critereIdsApplicables(bailleur.getId()));
        List<AuditCritere> auditCriteres = auditCritereRepository.parAudit(audit.getId()).stream()
                .filter(ac -> critereIdsApplicables.contains(ac.getCritere().getId()))
                .toList();

        return switch (format) {
            case CSV -> genererIndiceCsv(audit, bailleur, indice, auditCriteres);
            case PDF -> genererIndicePdf(audit, bailleur, indice, auditCriteres);
            case EXCEL -> throw new IllegalArgumentException("Format EXCEL non encore supporté pour ce rapport");
        };
    }

    // --- SYNTHESE -----------------------------------------------------------

    private byte[] genererSyntheseCsv(Audit audit, AuditScoreDto score, List<NonConforme> nonConformites) {
        StringBuilder csv = new StringBuilder();
        enTeteCsv(csv, "Rapport de synthèse", audit);
        sectionScoreCsv(csv, score);

        csv.append("Non-conformités;Critère;Niveau;Risque attendu;Statut;Actions correctives\n");
        for (NonConforme nc : nonConformites) {
            int nombreActions = actionCorrectiveRepository.parNonConforme(nc.getId()).size();
            csv.append(echapper(nc.getTitre())).append(';')
                    .append(nc.getEvaluation().getAuditCritere().getCritere().getCode()).append(';')
                    .append(nc.getNiveau()).append(';')
                    .append(nc.getRisqueAttendu()).append(';')
                    .append(nc.getStatut()).append(';')
                    .append(nombreActions).append('\n');
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] genererSynthesePdf(Audit audit, AuditScoreDto score, List<NonConforme> nonConformites) {
        return construirePdf(audit, "Rapport de synthèse", (document, polices) -> {
            sectionScorePdf(document, polices, score);
            sectionNonConformitesPdf(document, polices, nonConformites);
        });
    }

    private void sectionNonConformitesPdf(Document document, Polices polices, List<NonConforme> nonConformites) throws DocumentException {
        document.add(titreSection("Non-conformités (" + nonConformites.size() + ")", polices));
        if (nonConformites.isEmpty()) {
            document.add(carteVide("Aucune non-conformité détectée à ce stade de la mission.", polices));
            return;
        }
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        for (String entete : List.of("Critère", "Niveau", "Statut", "Actions correctives")) {
            table.addCell(celluleEntete(entete, polices.enTeteTableau()));
        }
        int index = 0;
        for (NonConforme nc : nonConformites) {
            int nombreActions = actionCorrectiveRepository.parNonConforme(nc.getId()).size();
            boolean paire = index++ % 2 == 1;
            table.addCell(cellule(nc.getEvaluation().getAuditCritere().getCritere().getCode() + " — " + nc.getTitre(), polices.normal(), paire, Element.ALIGN_LEFT));
            table.addCell(celluleBadge(nc.getNiveau().name(), couleurNiveauNonConformite(nc.getNiveau().name()), paire));
            table.addCell(cellule(nc.getStatut().name(), polices.normal(), paire, Element.ALIGN_LEFT));
            table.addCell(cellule(String.valueOf(nombreActions), polices.normal(), paire, Element.ALIGN_RIGHT));
        }
        document.add(table);
    }

    // --- DETAILLE -------------------------------------------------------------

    private byte[] genererDetailleCsv(Audit audit, AuditScoreDto score, List<AuditCritere> auditCriteres,
                                      boolean avecRaisonnementIa) {
        StringBuilder csv = new StringBuilder();
        enTeteCsv(csv, "Rapport détaillé", audit);
        sectionScoreCsv(csv, score);

        // La colonne n'est pas écrite quand le raisonnement n'est pas dû :
        // ce qui n'est pas dans le fichier ne peut pas en ressortir.
        csv.append("Domaine;Critère;Libellé;Criticité;Coefficient;Statut critère;Niveau /5;Probabilité conforme;Statut évaluation;Source")
                .append(avecRaisonnementIa ? ";Justification" : "").append('\n');
        for (AuditCritere ac : auditCriteres) {
            Evaluation derniere = evaluationRepository.laPlusRecenteParAuditCritere(ac.getId()).orElse(null);
            csv.append(echapper(ac.getCritere().getDomaine().getNom())).append(';')
                    .append(ac.getCritere().getCode()).append(';')
                    .append(echapper(ac.getCritere().getLibelle())).append(';')
                    .append(ac.getCriticite() != null ? ac.getCriticite().getLibelle() : "—").append(';')
                    .append(ac.getCoefficientPonderation()).append(';')
                    .append(ac.getStatut()).append(';')
                    .append(derniere != null ? derniere.getNote() : "—").append(';')
                    .append(derniere != null ? formaterScore(derniere.getProbabiliteConforme()) : "—").append(';')
                    .append(derniere != null ? derniere.getStatut() : "—").append(';')
                    .append(derniere != null ? derniere.getSource() : "—");
            if (avecRaisonnementIa) {
                csv.append(';').append(derniere != null ? echapper(derniere.getJustification()) : "");
            }
            csv.append('\n');
        }

        sectionAxesValidesCsv(csv, audit);
        sectionPlansCsv(csv, audit);

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Les axes retenus par l'audit.
     *
     * <p>Seuls les axes <strong>valides</strong> y figurent : un axe encore
     * propose n'a ete accepte par personne, et le presenter dans le livrable
     * remis au client donnerait a une suggestion de machine le statut d'une
     * recommandation d'auditeur.
     */
    private void sectionAxesValidesCsv(StringBuilder csv, Audit audit) {
        var axes = axeAmeliorationRepository.validesParAudit(audit.getId());
        if (axes.isEmpty()) {
            return;
        }
        csv.append("\nAxes d'amelioration valides (").append(axes.size()).append(")\n");
        csv.append("Axe;Critere;Rattachement;Origine\n");
        for (AxeAmelioration axe : axes) {
            csv.append(echapper(axe.getLibelle())).append(';')
                    .append(axe.getAuditCritere() == null ? "-"
                            : axe.getAuditCritere().getCritere().getCode()).append(';')
                    .append(referenceAxe(axe)).append(';')
                    .append(axe.getOrigine()).append('\n');
        }
    }

    /** Le code metier de la cible, plus parlant qu'un identifiant. */
    private static String referenceAxe(AxeAmelioration axe) {
        if (axe.getExigence() != null) return axe.getExigence().getCode();
        if (axe.getPreuveAttendue() != null) return echapper(axe.getPreuveAttendue().getLibelle());
        if (axe.getRegleAnalyse() != null) return axe.getRegleAnalyse().getCode();
        return "-";
    }

    /**
     * Les plans d'amelioration et leurs actions.
     *
     * <p>La progression n'est pas recalculee ici : elle vient de
     * {@link PlanActionService#progression(List)}, la meme fonction que celle
     * qui alimente l'ecran. Deux calculs separes finiraient par afficher deux
     * avancements pour un meme plan.
     */
    private void sectionPlansCsv(StringBuilder csv, Audit audit) {
        var plans = planActionRepository.parAudit(audit.getId());
        if (plans.isEmpty()) {
            return;
        }
        csv.append("\nPlans d'amelioration (").append(plans.size()).append(")\n");
        for (PlanAction plan : plans) {
            var actions = actionPlanRepository.parPlan(plan.getId());
            csv.append("\nPlan;").append(echapper(plan.getTitre())).append('\n');
            csv.append("Statut;").append(plan.getStatut()).append('\n');
            csv.append("Avancement;").append(PlanActionService.progression(actions)).append("%\n");
            if (plan.getDateEcheance() != null) {
                csv.append("Echeance;").append(plan.getDateEcheance().format(FORMAT_DATE)).append('\n');
            }
            if (plan.getMotifCloture() != null && !plan.getMotifCloture().isBlank()) {
                csv.append("Motif de cloture;").append(echapper(plan.getMotifCloture())).append('\n');
            }
            if (actions.isEmpty()) {
                csv.append("(aucune action)\n");
                continue;
            }
            csv.append("Action;Responsable;Echeance;Statut;Priorite;En retard\n");
            for (ActionPlan action : actions) {
                csv.append(echapper(action.getTitre())).append(';')
                        .append(nomResponsable(action.getResponsable())).append(';')
                        .append(action.getDateEcheance() == null ? "-"
                                : action.getDateEcheance().format(FORMAT_DATE)).append(';')
                        .append(action.getStatut()).append(';')
                        .append(action.getPriorite()).append(';')
                        .append(PlanActionService.enRetard(action.getDateEcheance(), action.getStatut())
                                ? "oui" : "non").append('\n');
            }
        }
    }

    private static String nomResponsable(com.smartexsustway.api.domain.entity.Utilisateur u) {
        return u == null ? "Non affectee" : echapper(u.getPrenom() + " " + u.getNom());
    }

    private byte[] genererDetaillePdf(Audit audit, AuditScoreDto score, List<AuditCritere> auditCriteres,
                                      boolean avecRaisonnementIa) {
        return construirePdf(audit, "Rapport détaillé", (document, polices) -> {
            sectionScorePdf(document, polices, score);

            document.add(titreSection("Détail par critère (" + auditCriteres.size() + ")", polices));
            PdfPTable table = avecRaisonnementIa
                    ? new PdfPTable(new float[] {2.5f, 1.2f, 3f, 1.2f, 1f, 1.5f, 1.5f, 3f})
                    : new PdfPTable(new float[] {2.5f, 1.2f, 3f, 1.2f, 1f, 1.5f, 1.5f});
            table.setWidthPercentage(100);
            List<String> colonnes = avecRaisonnementIa
                    ? List.of("Domaine", "Critère", "Libellé", "Criticité", "Niveau /5", "Statut évaluation", "Source", "Justification")
                    : List.of("Domaine", "Critère", "Libellé", "Criticité", "Niveau /5", "Statut évaluation", "Source");
            for (String entete : colonnes) {
                table.addCell(celluleEntete(entete, polices.enTeteTableau()));
            }
            int index = 0;
            for (AuditCritere ac : auditCriteres) {
                Evaluation derniere = evaluationRepository.laPlusRecenteParAuditCritere(ac.getId()).orElse(null);
                boolean paire = index++ % 2 == 1;
                table.addCell(cellule(ac.getCritere().getDomaine().getNom(), polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(ac.getCritere().getCode(), polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(ac.getCritere().getLibelle(), polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(ac.getCriticite() != null ? ac.getCriticite().getLibelle() : "—", polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(derniere != null ? String.valueOf(derniere.getNote()) : "—", polices.normal(), paire, Element.ALIGN_RIGHT));
                table.addCell(cellule(derniere != null ? derniere.getStatut().name() : "—", polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(derniere != null ? derniere.getSource().name() : "—", polices.normal(), paire, Element.ALIGN_LEFT));
                if (avecRaisonnementIa) {
                    table.addCell(cellule(derniere != null && derniere.getJustification() != null
                            ? derniere.getJustification() : "—", polices.normal(), paire, Element.ALIGN_LEFT));
                }
            }
            document.add(table);

            sectionAxesValidesPdf(document, polices, audit);
            sectionPlansPdf(document, polices, audit);
        });
    }

    /** Les axes retenus — validés uniquement, voir {@link #sectionAxesValidesCsv}. */
    private void sectionAxesValidesPdf(Document document, Polices polices, Audit audit)
            throws DocumentException {
        var axes = axeAmeliorationRepository.validesParAudit(audit.getId());
        if (axes.isEmpty()) {
            return;
        }
        document.add(titreSection("Axes d'amélioration validés (" + axes.size() + ")", polices));
        PdfPTable table = new PdfPTable(new float[] {5f, 1.5f, 2.5f, 1.2f});
        table.setWidthPercentage(100);
        for (String entete : List.of("Axe", "Critère", "Rattachement", "Origine")) {
            table.addCell(celluleEntete(entete, polices.enTeteTableau()));
        }
        int index = 0;
        for (AxeAmelioration axe : axes) {
            boolean paire = index++ % 2 == 1;
            table.addCell(cellule(axe.getLibelle(), polices.normal(), paire, Element.ALIGN_LEFT));
            table.addCell(cellule(axe.getAuditCritere() == null ? "—"
                    : axe.getAuditCritere().getCritere().getCode(), polices.normal(), paire, Element.ALIGN_LEFT));
            table.addCell(cellule(referenceAxePdf(axe), polices.normal(), paire, Element.ALIGN_LEFT));
            table.addCell(cellule(axe.getOrigine().name(), polices.normal(), paire, Element.ALIGN_LEFT));
        }
        document.add(table);
    }

    /** Sans échappement CSV : le PDF n'en a pas besoin. */
    private static String referenceAxePdf(AxeAmelioration axe) {
        if (axe.getExigence() != null) return axe.getExigence().getCode();
        if (axe.getPreuveAttendue() != null) return axe.getPreuveAttendue().getLibelle();
        if (axe.getRegleAnalyse() != null) return axe.getRegleAnalyse().getCode();
        return "—";
    }

    /** Les plans et leurs actions — progression issue du service, voir {@link #sectionPlansCsv}. */
    private void sectionPlansPdf(Document document, Polices polices, Audit audit)
            throws DocumentException {
        var plans = planActionRepository.parAudit(audit.getId());
        if (plans.isEmpty()) {
            return;
        }
        document.add(titreSection("Plans d'amélioration (" + plans.size() + ")", polices));
        for (PlanAction plan : plans) {
            var actions = actionPlanRepository.parPlan(plan.getId());
            StringBuilder entete = new StringBuilder(plan.getTitre())
                    .append(" — ").append(plan.getStatut())
                    .append(" — ").append(PlanActionService.progression(actions)).append(" %");
            if (plan.getDateEcheance() != null) {
                entete.append(" — échéance ").append(plan.getDateEcheance().format(FORMAT_DATE));
            }
            document.add(titreSection(entete.toString(), polices));
            if (plan.getMotifCloture() != null && !plan.getMotifCloture().isBlank()) {
                document.add(titreSection("Motif de clôture : " + plan.getMotifCloture(), polices));
            }
            if (actions.isEmpty()) {
                continue;
            }
            PdfPTable table = new PdfPTable(new float[] {4f, 2f, 1.5f, 1.5f, 1.2f, 1f});
            table.setWidthPercentage(100);
            for (String col : List.of("Action", "Responsable", "Échéance", "Statut", "Priorité", "Retard")) {
                table.addCell(celluleEntete(col, polices.enTeteTableau()));
            }
            int index = 0;
            for (ActionPlan action : actions) {
                boolean paire = index++ % 2 == 1;
                table.addCell(cellule(action.getTitre(), polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(action.getResponsable() == null ? "Non affectée"
                                : action.getResponsable().getPrenom() + " " + action.getResponsable().getNom(),
                        polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(action.getDateEcheance() == null ? "—"
                        : action.getDateEcheance().format(FORMAT_DATE), polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(action.getStatut().name(), polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(action.getPriorite().name(), polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(PlanActionService.enRetard(action.getDateEcheance(), action.getStatut())
                        ? "oui" : "non", polices.normal(), paire, Element.ALIGN_CENTER));
            }
            document.add(table);
        }
    }

    // --- PLAN_ACTION ------------------------------------------------------

    private byte[] genererPlanActionCsv(Audit audit, List<NonConforme> nonConformites) {
        StringBuilder csv = new StringBuilder();
        enTeteCsv(csv, "Plan d'actions correctives", audit);

        csv.append("Non-conformité;Critère;Niveau NC;Action;Responsable;Échéance;Statut;Priorité\n");
        for (NonConforme nc : nonConformites) {
            List<ActionCorrective> actions = actionCorrectiveRepository.parNonConforme(nc.getId());
            String critere = nc.getEvaluation().getAuditCritere().getCritere().getCode();
            if (actions.isEmpty()) {
                csv.append(echapper(nc.getTitre())).append(';').append(critere).append(';').append(nc.getNiveau())
                        .append(";—;—;—;—;—\n");
                continue;
            }
            for (ActionCorrective action : actions) {
                csv.append(echapper(nc.getTitre())).append(';').append(critere).append(';').append(nc.getNiveau()).append(';')
                        .append(echapper(action.getTitre())).append(';')
                        .append(nomResponsable(action)).append(';')
                        .append(action.getDateEcheance() != null ? action.getDateEcheance().format(FORMAT_DATE) : "—").append(';')
                        .append(action.getStatut()).append(';')
                        .append(action.getPriorite()).append('\n');
            }
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] genererPlanActionPdf(Audit audit, List<NonConforme> nonConformites) {
        return construirePdf(audit, "Plan d'actions correctives", (document, polices) -> {
            document.add(titreSection("Actions correctives (" + nonConformites.size() + " non-conformités)", polices));
            if (nonConformites.isEmpty()) {
                document.add(carteVide("Aucune non-conformité détectée à ce stade de la mission.", polices));
                return;
            }
            PdfPTable table = new PdfPTable(new float[] {2.5f, 1f, 2.5f, 1.8f, 1.3f, 1.3f, 1.2f});
            table.setWidthPercentage(100);
            for (String entete : List.of("Non-conformité", "Critère", "Action", "Responsable", "Échéance", "Statut", "Priorité")) {
                table.addCell(celluleEntete(entete, polices.enTeteTableau()));
            }
            int index = 0;
            for (NonConforme nc : nonConformites) {
                List<ActionCorrective> actions = actionCorrectiveRepository.parNonConforme(nc.getId());
                String critere = nc.getEvaluation().getAuditCritere().getCritere().getCode();
                if (actions.isEmpty()) {
                    boolean paire = index++ % 2 == 1;
                    table.addCell(cellule(nc.getTitre(), polices.normal(), paire, Element.ALIGN_LEFT));
                    table.addCell(cellule(critere, polices.normal(), paire, Element.ALIGN_LEFT));
                    table.addCell(cellule("Aucune action définie", polices.normal(), paire, Element.ALIGN_LEFT));
                    table.addCell(cellule("—", polices.normal(), paire, Element.ALIGN_LEFT));
                    table.addCell(cellule("—", polices.normal(), paire, Element.ALIGN_LEFT));
                    table.addCell(cellule("—", polices.normal(), paire, Element.ALIGN_LEFT));
                    table.addCell(cellule("—", polices.normal(), paire, Element.ALIGN_LEFT));
                    continue;
                }
                for (ActionCorrective action : actions) {
                    boolean paire = index++ % 2 == 1;
                    table.addCell(cellule(nc.getTitre(), polices.normal(), paire, Element.ALIGN_LEFT));
                    table.addCell(cellule(critere, polices.normal(), paire, Element.ALIGN_LEFT));
                    table.addCell(cellule(action.getTitre(), polices.normal(), paire, Element.ALIGN_LEFT));
                    table.addCell(cellule(nomResponsable(action), polices.normal(), paire, Element.ALIGN_LEFT));
                    table.addCell(cellule(action.getDateEcheance() != null ? action.getDateEcheance().format(FORMAT_DATE) : "—", polices.normal(), paire, Element.ALIGN_LEFT));
                    table.addCell(celluleBadge(action.getStatut().name(), BLEU, paire));
                    table.addCell(celluleBadge(action.getPriorite().name(), couleurPriorite(action.getPriorite().name()), paire));
                }
            }
            document.add(table);
        });
    }

    private static String nomResponsable(ActionCorrective action) {
        Utilisateur responsable = action.getResponsable();
        if (responsable == null) return "Non assigné";
        return (responsable.getPrenom() + " " + responsable.getNom()).trim();
    }

    // --- INDICE_FINANCEMENTS_VERTS -----------------------------------------

    private byte[] genererIndiceCsv(Audit audit, Bailleur bailleur, IndicePreparation indice, List<AuditCritere> auditCriteres) {
        StringBuilder csv = new StringBuilder();
        enTeteCsv(csv, "Indice de préparation aux financements verts", audit);
        csv.append("Bailleur;").append(bailleur.getCode()).append(" — ").append(bailleur.getNom()).append('\n');
        csv.append("Indice de préparation;").append(formaterScore(indice.getScore())).append("/5\n");
        csv.append("Critères applicables à ce bailleur;").append(auditCriteres.size()).append('\n');
        csv.append('\n');

        csv.append("Critère;Libellé;Domaine;Criticité;Coefficient;Niveau /5;Probabilité conforme;Statut évaluation\n");
        for (AuditCritere ac : auditCriteres) {
            Evaluation derniere = evaluationRepository.laPlusRecenteParAuditCritere(ac.getId()).orElse(null);
            csv.append(ac.getCritere().getCode()).append(';')
                    .append(echapper(ac.getCritere().getLibelle())).append(';')
                    .append(echapper(ac.getCritere().getDomaine().getNom())).append(';')
                    .append(ac.getCriticite() != null ? ac.getCriticite().getLibelle() : "—").append(';')
                    .append(ac.getCoefficientPonderation()).append(';')
                    .append(derniere != null ? derniere.getNote() : "—").append(';')
                    .append(derniere != null ? formaterScore(derniere.getProbabiliteConforme()) : "—").append(';')
                    .append(derniere != null ? derniere.getStatut() : "—").append('\n');
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] genererIndicePdf(Audit audit, Bailleur bailleur, IndicePreparation indice, List<AuditCritere> auditCriteres) {
        return construirePdf(audit, "Indice de préparation aux financements verts", (document, polices) -> {
            document.add(carteIndice(bailleur, indice, polices));
            document.add(new Paragraph(
                    "Cet indice mesure un alignement avec les critères tagués pour ce bailleur, pas une garantie d'éligibilité au financement.",
                    polices.avertissement()));
            document.add(Chunk.NEWLINE);

            document.add(titreSection("Critères applicables (" + auditCriteres.size() + ")", polices));
            if (auditCriteres.isEmpty()) {
                document.add(carteVide("Aucun critère n'est encore tagué comme applicable à ce bailleur.", polices));
                return;
            }
            PdfPTable table = new PdfPTable(new float[] {1.3f, 3f, 2f, 1.3f, 1.3f, 1.5f});
            table.setWidthPercentage(100);
            for (String entete : List.of("Critère", "Libellé", "Domaine", "Criticité", "Niveau /5", "Statut évaluation")) {
                table.addCell(celluleEntete(entete, polices.enTeteTableau()));
            }
            int index = 0;
            for (AuditCritere ac : auditCriteres) {
                Evaluation derniere = evaluationRepository.laPlusRecenteParAuditCritere(ac.getId()).orElse(null);
                boolean paire = index++ % 2 == 1;
                table.addCell(cellule(ac.getCritere().getCode(), polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(ac.getCritere().getLibelle(), polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(ac.getCritere().getDomaine().getNom(), polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(ac.getCriticite() != null ? ac.getCriticite().getLibelle() : "—", polices.normal(), paire, Element.ALIGN_LEFT));
                table.addCell(cellule(derniere != null ? String.valueOf(derniere.getNote()) : "—", polices.normal(), paire, Element.ALIGN_RIGHT));
                table.addCell(cellule(derniere != null ? derniere.getStatut().name() : "—", polices.normal(), paire, Element.ALIGN_LEFT));
            }
            document.add(table);
        });
    }

    /** Même esprit que la carte "Score global" (gros chiffre coloré + méta) mais centrée sur le bailleur plutôt que le score par domaine. */
    private PdfPTable carteIndice(Bailleur bailleur, IndicePreparation indice, Polices polices) {
        Color couleur = couleurNiveau(indice.getScore());
        PdfPTable carte = new PdfPTable(new float[] {1.3f, 2f});
        carte.setWidthPercentage(100);

        PdfPCell celluleChiffre = celluleCarte();
        Paragraph chiffre = new Paragraph();
        chiffre.add(new Chunk(formaterScore(indice.getScore()), new Font(Font.HELVETICA, 32, Font.BOLD, couleur)));
        chiffre.add(new Chunk(" / 5", polices.scoreUnite()));
        celluleChiffre.addElement(chiffre);
        carte.addCell(celluleChiffre);

        PdfPCell celluleDetail = celluleCarte();
        celluleDetail.addElement(new Paragraph(bailleur.getNom() + " (" + bailleur.getCode() + ")", polices.sousTitre()));
        celluleDetail.addElement(new Paragraph("Calculé le " + FORMAT_DATE.format(indice.getDateCalcul()), polices.meta()));
        carte.addCell(celluleDetail);

        return carte;
    }

    // --- Blocs communs (en-tête, score) -------------------------------------

    /**
     * Périmètre de la mission, tel qu'il doit apparaître en tête de rapport.
     *
     * Un rapport d'audit dit ce qu'il a examiné : sans cette mention, le
     * périmètre choisi à l'écran restait une information que personne ne
     * pouvait lire. Une mission sans site retenu porte sur l'organisation
     * entière — c'est le cas courant, et le dire vaut mieux que laisser la
     * ligne vide.
     */
    private String perimetre(Audit audit) {
        List<UUID> siteIds = auditSiteRepository.siteIdsPourAudit(audit.getId());
        if (siteIds.isEmpty()) {
            return "Organisation entière";
        }
        String sites = siteIds.stream()
                .map(siteRepository::findById)
                .filter(Objects::nonNull)
                .map(Site::getNom)
                .collect(Collectors.joining(", "));
        return sites.isEmpty() ? "Organisation entière" : sites;
    }

    private void enTeteCsv(StringBuilder csv, String titre, Audit audit) {
        csv.append(titre).append(" — ").append(audit.getNom()).append('\n');
        // Le code seul ne dit pas sous quel texte la mission a été conduite :
        // un référentiel est versionné et immuable, et deux versions n'exigent
        // pas les mêmes preuves. Le livrable doit nommer celle qui fait foi.
        csv.append("Référentiel;").append(audit.getReferentiel().getCode())
                .append(audit.getReferentielVersion() == null ? ""
                        : " v" + audit.getReferentielVersion().getNumero())
                .append('\n');
        csv.append("Entreprise;").append(audit.getEntreprise().getRaisonSociale()).append('\n');
        csv.append("Périmètre;").append(echapper(perimetre(audit))).append('\n');
        csv.append("Date de début;").append(audit.getDateDebut().format(FORMAT_DATE)).append('\n');
        csv.append("Statut;").append(audit.getStatut()).append('\n');
        csv.append('\n');
    }

    private void sectionScoreCsv(StringBuilder csv, AuditScoreDto score) {
        csv.append("Score global;").append(formaterScore(score.scoreGlobal())).append("/5\n");
        csv.append("Critères évalués;").append(score.nombreCriteresEvalues()).append('/').append(score.nombreCriteresTotal()).append('\n');
        csv.append("En revue experte;").append(score.nombreCriteresEnRevue()).append('\n');
        csv.append("Non évalués;").append(score.nombreCriteresNonEvalues()).append('\n');
        csv.append('\n');

        csv.append("Domaine;Code;Score /5;Critères évalués;Critères totaux\n");
        for (AuditScoreDto.DomaineScoreDto d : score.domaines()) {
            csv.append(echapper(d.domaineNom())).append(';')
                    .append(d.domaineCode()).append(';')
                    .append(formaterScore(d.score())).append(';')
                    .append(d.nombreCriteresEvalues()).append(';')
                    .append(d.nombreCriteresTotal()).append('\n');
        }
        csv.append('\n');
    }

    private void sectionScorePdf(Document document, Polices polices, AuditScoreDto score) throws DocumentException {
        document.add(titreSection("Score global", polices));
        document.add(carteScoreGlobal(score, polices));
        document.add(Chunk.NEWLINE);

        document.add(titreSection("Score par domaine", polices));
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        for (String entete : List.of("Domaine", "Score /5", "Évalués", "Total")) {
            table.addCell(celluleEntete(entete, polices.enTeteTableau()));
        }
        int index = 0;
        for (AuditScoreDto.DomaineScoreDto d : score.domaines()) {
            boolean paire = index++ % 2 == 1;
            table.addCell(cellule(d.domaineNom() + " (" + d.domaineCode() + ")", polices.normal(), paire, Element.ALIGN_LEFT));
            table.addCell(celluleScoreColore(formaterScore(d.score()), couleurNiveau(d.score()), paire));
            table.addCell(cellule(String.valueOf(d.nombreCriteresEvalues()), polices.normal(), paire, Element.ALIGN_RIGHT));
            table.addCell(cellule(String.valueOf(d.nombreCriteresTotal()), polices.normal(), paire, Element.ALIGN_RIGHT));
        }
        document.add(table);
        document.add(Chunk.NEWLINE);
    }

    /** Gros chiffre coloré selon le niveau (même code couleur que tonScore() côté frontend) + les 3 compteurs d'avancement en regard. */
    private PdfPTable carteScoreGlobal(AuditScoreDto score, Polices polices) {
        Color couleur = couleurNiveau(score.scoreGlobal());
        PdfPTable carte = new PdfPTable(new float[] {1.3f, 2f});
        carte.setWidthPercentage(100);

        PdfPCell celluleChiffre = celluleCarte();
        Paragraph chiffre = new Paragraph();
        chiffre.add(new Chunk(formaterScore(score.scoreGlobal()), new Font(Font.HELVETICA, 34, Font.BOLD, couleur)));
        chiffre.add(new Chunk(" / 5", polices.scoreUnite()));
        celluleChiffre.addElement(chiffre);
        carte.addCell(celluleChiffre);

        PdfPCell celluleDetail = celluleCarte();
        celluleDetail.addElement(new Paragraph("Évalués : " + score.nombreCriteresEvalues() + " / " + score.nombreCriteresTotal(), polices.normal()));
        celluleDetail.addElement(new Paragraph("En revue experte : " + score.nombreCriteresEnRevue(), polices.normal()));
        celluleDetail.addElement(new Paragraph("Non évalués : " + score.nombreCriteresNonEvalues(), polices.normal()));
        carte.addCell(celluleDetail);

        return carte;
    }

    private static PdfPCell celluleCarte() {
        PdfPCell cellule = new PdfPCell();
        cellule.setBackgroundColor(GRIS_CLAIR);
        cellule.setBorder(Rectangle.NO_BORDER);
        cellule.setPadding(12);
        cellule.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return cellule;
    }

    /** Encadré discret pour un état "vide" (aucune non-conformité, aucun critère tagué…) — même ton que le composant Vide du frontend. */
    private static PdfPTable carteVide(String message, Polices polices) {
        PdfPCell cellule = celluleCarte();
        cellule.setHorizontalAlignment(Element.ALIGN_CENTER);
        cellule.addElement(new Paragraph(message, polices.meta()));
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        table.addCell(cellule);
        return table;
    }

    private static Paragraph titreSection(String texte, Polices polices) {
        Paragraph p = new Paragraph(texte, polices.sousTitre());
        p.setSpacingBefore(4);
        p.setSpacingAfter(6);
        return p;
    }

    /**
     * Même seuils que tonScore() dans TableauDeBord.jsx/EntrepriseDetail.jsx
     * (frontend) : vert ≥4, bleu ≥3, ambre ≥2, rouge sinon — un rapport ne
     * doit jamais raconter une histoire de couleur différente de l'écran.
     */
    private static Color couleurNiveau(BigDecimal score) {
        double valeur = score.doubleValue();
        if (valeur >= 4) return BRAND;
        if (valeur >= 3) return BLEU;
        if (valeur >= 2) return AMBRE;
        return ROUGE;
    }

    private static Color couleurNiveauNonConformite(String niveau) {
        return switch (niveau) {
            case "CRITIQUE" -> ROUGE;
            case "MAJEURE" -> AMBRE;
            case "MODEREE" -> BLEU;
            default -> ENCRE_ATTENUEE;
        };
    }

    private static Color couleurPriorite(String priorite) {
        return switch (priorite) {
            case "CRITIQUE" -> ROUGE;
            case "HAUTE" -> AMBRE;
            case "MOYENNE" -> BLEU;
            default -> ENCRE_ATTENUEE;
        };
    }

    private static String echapper(String valeur) {
        if (valeur == null) return "";
        return valeur.replace(";", ",").replace("\n", " ");
    }

    /**
     * ScoringEngine.scorePondere renvoie BigDecimal.ZERO (échelle 0) sur ses
     * deux raccourcis "aucun critère évalué" / "somme des coefficients
     * nulle", mais une échelle 4 dans le cas général (division exacte) —
     * sans cette normalisation, un domaine sans évaluation afficherait "0"
     * à côté d'un domaine évalué affichant "3.5000", incohérence purement
     * d'affichage (aucun impact sur le calcul lui-même). Réutilisée pour
     * toute valeur BigDecimal affichée dans un rapport (score /5 ou
     * probabilité 0-1).
     */
    private static String formaterScore(BigDecimal score) {
        return score.setScale(2, RoundingMode.HALF_UP).toString();
    }

    // --- Construction PDF partagée ------------------------------------------

    private record Polices(
            Font titre,
            Font sousTitre,
            Font normal,
            Font enTeteTableau,
            Font meta,
            Font scoreUnite,
            Font badge,
            Font avertissement) {}

    @FunctionalInterface
    private interface CorpsPdf {
        void ecrire(Document document, Polices polices) throws DocumentException;
    }

    private byte[] construirePdf(Audit audit, String titreRapport, CorpsPdf corps) {
        Document document = new Document(PageSize.A4, 40, 40, 40, 40);
        ByteArrayOutputStream flux = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, flux);
            document.open();

            Polices polices = new Polices(
                    new Font(Font.HELVETICA, 19, Font.BOLD, BRAND_FONCE),
                    new Font(Font.HELVETICA, 13, Font.BOLD, ENCRE),
                    new Font(Font.HELVETICA, 10, Font.NORMAL, ENCRE),
                    new Font(Font.HELVETICA, 9, Font.BOLD, BLANC),
                    new Font(Font.HELVETICA, 9, Font.NORMAL, ENCRE_ATTENUEE),
                    new Font(Font.HELVETICA, 12, Font.NORMAL, ENCRE_ATTENUEE),
                    new Font(Font.HELVETICA, 8, Font.BOLD, BLANC),
                    new Font(Font.HELVETICA, 9, Font.ITALIC, ENCRE_ATTENUEE));

            document.add(carteEnTete(audit, titreRapport, polices));
            document.add(Chunk.NEWLINE);

            corps.ecrire(document, polices);

            ajouterPiedDePage(document, polices);
            document.close();
        } catch (DocumentException e) {
            throw new RapportGenerationException("Échec de génération du rapport PDF", e);
        }
        return flux.toByteArray();
    }

    /** Bandeau d'en-tête : fond vert clair de marque, titre + mission en avant, méta (référentiel/entreprise/date/statut) en dessous. */
    private PdfPTable carteEnTete(Audit audit, String titreRapport, Polices polices) {
        PdfPTable enTete = new PdfPTable(1);
        enTete.setWidthPercentage(100);

        PdfPCell carte = new PdfPCell();
        carte.setBackgroundColor(BRAND_CLAIR);
        carte.setBorder(Rectangle.BOTTOM);
        carte.setBorderWidth(2f);
        carte.setBorderColor(BRAND);
        carte.setPadding(16);
        carte.addElement(new Paragraph(titreRapport, polices.titre()));
        carte.addElement(new Paragraph(audit.getNom(), new Font(Font.HELVETICA, 12, Font.NORMAL, ENCRE)));
        Paragraph meta = new Paragraph();
        meta.setSpacingBefore(6);
        meta.add(new Chunk("Référentiel " + audit.getReferentiel().getCode(), polices.meta()));
        meta.add(new Chunk("   •   ", polices.meta()));
        meta.add(new Chunk(audit.getEntreprise().getRaisonSociale(), polices.meta()));
        meta.add(new Chunk("   •   Début le " + audit.getDateDebut().format(FORMAT_DATE), polices.meta()));
        meta.add(new Chunk("   •   Statut " + audit.getStatut(), polices.meta()));
        carte.addElement(meta);
        // Le périmètre sur sa propre ligne : une liste de sites déborderait de
        // la ligne des métadonnées dès qu'une mission en couvre plusieurs.
        Paragraph ligneperimetre = new Paragraph("Périmètre : " + perimetre(audit), polices.meta());
        ligneperimetre.setSpacingBefore(3);
        carte.addElement(ligneperimetre);
        enTete.addCell(carte);

        return enTete;
    }

    private void ajouterPiedDePage(Document document, Polices polices) throws DocumentException {
        Paragraph pied = new Paragraph("SMARTEX SustWay — Généré automatiquement.", polices.avertissement());
        pied.setSpacingBefore(14);
        pied.setAlignment(Element.ALIGN_CENTER);
        document.add(pied);
    }

    private static PdfPCell celluleEntete(String texte, Font police) {
        PdfPCell cellule = new PdfPCell(new Phrase(texte, police));
        cellule.setBackgroundColor(BRAND);
        cellule.setBorder(Rectangle.NO_BORDER);
        cellule.setHorizontalAlignment(Element.ALIGN_LEFT);
        cellule.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cellule.setPadding(6);
        return cellule;
    }

    /** Ligne zébrée (fond gris très clair une ligne sur deux) et bordure fine, plus lisible qu'une bordure noire uniforme sur un tableau long. */
    private static PdfPCell cellule(String texte, Font police, boolean ligneImpaire, int alignement) {
        PdfPCell cellule = new PdfPCell(new Phrase(texte, police));
        cellule.setBackgroundColor(ligneImpaire ? GRIS_CLAIR : BLANC);
        cellule.setBorder(Rectangle.BOTTOM);
        cellule.setBorderWidth(0.5f);
        cellule.setBorderColor(GRIS_BORDURE);
        cellule.setHorizontalAlignment(alignement);
        cellule.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cellule.setPadding(6);
        return cellule;
    }

    /** Score/note coloré selon son niveau (même principe que la carte Score global), centré, pour une colonne "Score" ou "Niveau /5" dans un tableau. */
    private static PdfPCell celluleScoreColore(String texte, Color couleur, boolean ligneImpaire) {
        PdfPCell cellule = cellule(texte, new Font(Font.HELVETICA, 10, Font.BOLD, couleur), ligneImpaire, Element.ALIGN_CENTER);
        return cellule;
    }

    /** Pastille colorée (fond clair + texte de la même teinte) pour un statut/niveau/priorité — équivalent PDF du composant Badge du frontend. */
    private static PdfPCell celluleBadge(String texte, Color couleur, boolean ligneImpaire) {
        PdfPCell cellule = new PdfPCell();
        cellule.setBackgroundColor(ligneImpaire ? GRIS_CLAIR : BLANC);
        cellule.setBorder(Rectangle.BOTTOM);
        cellule.setBorderWidth(0.5f);
        cellule.setBorderColor(GRIS_BORDURE);
        cellule.setHorizontalAlignment(Element.ALIGN_LEFT);
        cellule.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cellule.setPadding(6);

        PdfPTable pastille = new PdfPTable(1);
        pastille.setWidthPercentage(70);
        PdfPCell interieur = new PdfPCell(new Phrase(texte, new Font(Font.HELVETICA, 8, Font.BOLD, couleur)));
        interieur.setBackgroundColor(teinteClaire(couleur));
        interieur.setBorder(Rectangle.NO_BORDER);
        interieur.setHorizontalAlignment(Element.ALIGN_CENTER);
        interieur.setPadding(3);
        pastille.addCell(interieur);
        cellule.addElement(pastille);
        return cellule;
    }

    /** Version très éclaircie d'une couleur de marque, pour servir de fond à une pastille sans écraser le texte coloré posé dessus. */
    private static Color teinteClaire(Color couleur) {
        int r = 255 - (255 - couleur.getRed()) / 6;
        int g = 255 - (255 - couleur.getGreen()) / 6;
        int b = 255 - (255 - couleur.getBlue()) / 6;
        return new Color(r, g, b);
    }
}
