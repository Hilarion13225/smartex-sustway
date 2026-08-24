package com.smartexsustway.api.rapport;

import com.smartexsustway.api.domain.entity.ActionCorrective;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Bailleur;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.IndicePreparation;
import com.smartexsustway.api.domain.entity.NonConforme;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.FormatRapport;
import com.smartexsustway.api.domain.repository.ActionCorrectiveRepository;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.CritereBailleurRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.NonConformeRepository;
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
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Module 12 — génération des rapports d'une mission d'audit, aux formats
 * CSV et PDF. SYNTHESE et DETAILLE réutilisent AuditScoreService (même
 * calcul que le tableau de bord, RG32) : le rapport ne doit jamais afficher
 * un chiffre différent de l'écran. INDICE_FINANCEMENTS_VERTS recalcule
 * l'indice via IndicePreparationService pour la même raison (RG42).
 */
@ApplicationScoped
public class RapportGenerationService {

    private static final DateTimeFormatter FORMAT_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Inject AuditScoreService auditScoreService;
    @Inject NonConformeRepository nonConformeRepository;
    @Inject ActionCorrectiveRepository actionCorrectiveRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject CritereBailleurRepository critereBailleurRepository;
    @Inject IndicePreparationService indicePreparationService;

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
    public byte[] genererDetaille(Audit audit, FormatRapport format) {
        AuditScoreDto score = auditScoreService.calculer(audit);
        List<AuditCritere> auditCriteres = auditCritereRepository.parAudit(audit.getId());

        return switch (format) {
            case CSV -> genererDetailleCsv(audit, score, auditCriteres);
            case PDF -> genererDetaillePdf(audit, score, auditCriteres);
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

            document.add(new Paragraph("Non-conformités (" + nonConformites.size() + ")", polices.sousTitre()));
            if (nonConformites.isEmpty()) {
                document.add(new Paragraph("Aucune non-conformité détectée à ce stade de la mission.", polices.normal()));
            } else {
                PdfPTable table = new PdfPTable(4);
                table.setWidthPercentage(100);
                for (String entete : List.of("Critère", "Niveau", "Statut", "Actions correctives")) {
                    table.addCell(celluleEntete(entete, polices.enTeteTableau()));
                }
                for (NonConforme nc : nonConformites) {
                    int nombreActions = actionCorrectiveRepository.parNonConforme(nc.getId()).size();
                    table.addCell(cellule(nc.getEvaluation().getAuditCritere().getCritere().getCode() + " — " + nc.getTitre(), polices.normal()));
                    table.addCell(cellule(nc.getNiveau().name(), polices.normal()));
                    table.addCell(cellule(nc.getStatut().name(), polices.normal()));
                    table.addCell(cellule(String.valueOf(nombreActions), polices.normal()));
                }
                document.add(table);
            }
        });
    }

    // --- DETAILLE -------------------------------------------------------------

    private byte[] genererDetailleCsv(Audit audit, AuditScoreDto score, List<AuditCritere> auditCriteres) {
        StringBuilder csv = new StringBuilder();
        enTeteCsv(csv, "Rapport détaillé", audit);
        sectionScoreCsv(csv, score);

        csv.append("Domaine;Critère;Libellé;Criticité;Coefficient;Statut critère;Niveau /5;Probabilité conforme;Statut évaluation;Source;Justification\n");
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
                    .append(derniere != null ? derniere.getSource() : "—").append(';')
                    .append(derniere != null ? echapper(derniere.getJustification()) : "").append('\n');
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] genererDetaillePdf(Audit audit, AuditScoreDto score, List<AuditCritere> auditCriteres) {
        return construirePdf(audit, "Rapport détaillé", (document, polices) -> {
            sectionScorePdf(document, polices, score);

            document.add(new Paragraph("Détail par critère (" + auditCriteres.size() + ")", polices.sousTitre()));
            PdfPTable table = new PdfPTable(new float[] {2.5f, 1.2f, 3f, 1.2f, 1f, 1.5f, 1.5f, 3f});
            table.setWidthPercentage(100);
            for (String entete : List.of("Domaine", "Critère", "Libellé", "Criticité", "Niveau /5", "Statut évaluation", "Source", "Justification")) {
                table.addCell(celluleEntete(entete, polices.enTeteTableau()));
            }
            for (AuditCritere ac : auditCriteres) {
                Evaluation derniere = evaluationRepository.laPlusRecenteParAuditCritere(ac.getId()).orElse(null);
                table.addCell(cellule(ac.getCritere().getDomaine().getNom(), polices.normal()));
                table.addCell(cellule(ac.getCritere().getCode(), polices.normal()));
                table.addCell(cellule(ac.getCritere().getLibelle(), polices.normal()));
                table.addCell(cellule(ac.getCriticite() != null ? ac.getCriticite().getLibelle() : "—", polices.normal()));
                table.addCell(cellule(derniere != null ? String.valueOf(derniere.getNote()) : "—", polices.normal()));
                table.addCell(cellule(derniere != null ? derniere.getStatut().name() : "—", polices.normal()));
                table.addCell(cellule(derniere != null ? derniere.getSource().name() : "—", polices.normal()));
                table.addCell(cellule(derniere != null && derniere.getJustification() != null ? derniere.getJustification() : "—", polices.normal()));
            }
            document.add(table);
        });
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
            document.add(new Paragraph("Actions correctives (" + nonConformites.size() + " non-conformités)", polices.sousTitre()));
            if (nonConformites.isEmpty()) {
                document.add(new Paragraph("Aucune non-conformité détectée à ce stade de la mission.", polices.normal()));
                return;
            }
            PdfPTable table = new PdfPTable(new float[] {2.5f, 1f, 2.5f, 1.8f, 1.3f, 1.3f, 1.2f});
            table.setWidthPercentage(100);
            for (String entete : List.of("Non-conformité", "Critère", "Action", "Responsable", "Échéance", "Statut", "Priorité")) {
                table.addCell(celluleEntete(entete, polices.enTeteTableau()));
            }
            for (NonConforme nc : nonConformites) {
                List<ActionCorrective> actions = actionCorrectiveRepository.parNonConforme(nc.getId());
                String critere = nc.getEvaluation().getAuditCritere().getCritere().getCode();
                if (actions.isEmpty()) {
                    table.addCell(cellule(nc.getTitre(), polices.normal()));
                    table.addCell(cellule(critere, polices.normal()));
                    table.addCell(cellule("Aucune action définie", polices.normal()));
                    table.addCell(cellule("—", polices.normal()));
                    table.addCell(cellule("—", polices.normal()));
                    table.addCell(cellule("—", polices.normal()));
                    table.addCell(cellule("—", polices.normal()));
                    continue;
                }
                for (ActionCorrective action : actions) {
                    table.addCell(cellule(nc.getTitre(), polices.normal()));
                    table.addCell(cellule(critere, polices.normal()));
                    table.addCell(cellule(action.getTitre(), polices.normal()));
                    table.addCell(cellule(nomResponsable(action), polices.normal()));
                    table.addCell(cellule(action.getDateEcheance() != null ? action.getDateEcheance().format(FORMAT_DATE) : "—", polices.normal()));
                    table.addCell(cellule(action.getStatut().name(), polices.normal()));
                    table.addCell(cellule(action.getPriorite().name(), polices.normal()));
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
            document.add(new Paragraph("Bailleur : " + bailleur.getCode() + " — " + bailleur.getNom(), polices.sousTitre()));
            document.add(new Paragraph("Indice de préparation : " + formaterScore(indice.getScore()) + " / 5", polices.normal()));
            document.add(new Paragraph(
                    "RG42 : cet indice mesure un alignement avec les critères tagués pour ce bailleur, pas une garantie d'éligibilité au financement.",
                    polices.normal()));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Critères applicables (" + auditCriteres.size() + ")", polices.sousTitre()));
            if (auditCriteres.isEmpty()) {
                document.add(new Paragraph("Aucun critère n'est encore tagué comme applicable à ce bailleur.", polices.normal()));
                return;
            }
            PdfPTable table = new PdfPTable(new float[] {1.3f, 3f, 2f, 1.3f, 1.3f, 1.5f});
            table.setWidthPercentage(100);
            for (String entete : List.of("Critère", "Libellé", "Domaine", "Criticité", "Niveau /5", "Statut évaluation")) {
                table.addCell(celluleEntete(entete, polices.enTeteTableau()));
            }
            for (AuditCritere ac : auditCriteres) {
                Evaluation derniere = evaluationRepository.laPlusRecenteParAuditCritere(ac.getId()).orElse(null);
                table.addCell(cellule(ac.getCritere().getCode(), polices.normal()));
                table.addCell(cellule(ac.getCritere().getLibelle(), polices.normal()));
                table.addCell(cellule(ac.getCritere().getDomaine().getNom(), polices.normal()));
                table.addCell(cellule(ac.getCriticite() != null ? ac.getCriticite().getLibelle() : "—", polices.normal()));
                table.addCell(cellule(derniere != null ? String.valueOf(derniere.getNote()) : "—", polices.normal()));
                table.addCell(cellule(derniere != null ? derniere.getStatut().name() : "—", polices.normal()));
            }
            document.add(table);
        });
    }

    // --- Blocs communs (en-tête, score) -------------------------------------

    private void enTeteCsv(StringBuilder csv, String titre, Audit audit) {
        csv.append(titre).append(" — ").append(audit.getNom()).append('\n');
        csv.append("Référentiel;").append(audit.getReferentiel().getCode()).append('\n');
        csv.append("Entreprise;").append(audit.getEntreprise().getRaisonSociale()).append('\n');
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
        document.add(new Paragraph("Score global", polices.sousTitre()));
        document.add(new Paragraph(
                "Score : " + formaterScore(score.scoreGlobal()) + " / 5 — Évalués : " + score.nombreCriteresEvalues() + " / "
                        + score.nombreCriteresTotal() + " — En revue experte : " + score.nombreCriteresEnRevue()
                        + " — Non évalués : " + score.nombreCriteresNonEvalues(),
                polices.normal()));
        document.add(Chunk.NEWLINE);

        document.add(new Paragraph("Score par domaine", polices.sousTitre()));
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        for (String entete : List.of("Domaine", "Score /5", "Évalués", "Total")) {
            table.addCell(celluleEntete(entete, polices.enTeteTableau()));
        }
        for (AuditScoreDto.DomaineScoreDto d : score.domaines()) {
            table.addCell(cellule(d.domaineNom() + " (" + d.domaineCode() + ")", polices.normal()));
            table.addCell(cellule(formaterScore(d.score()), polices.normal()));
            table.addCell(cellule(String.valueOf(d.nombreCriteresEvalues()), polices.normal()));
            table.addCell(cellule(String.valueOf(d.nombreCriteresTotal()), polices.normal()));
        }
        document.add(table);
        document.add(Chunk.NEWLINE);
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

    private record Polices(Font titre, Font sousTitre, Font normal, Font enTeteTableau) {}

    @FunctionalInterface
    private interface CorpsPdf {
        void ecrire(Document document, Polices polices) throws DocumentException;
    }

    private byte[] construirePdf(Audit audit, String titreRapport, CorpsPdf corps) {
        Document document = new Document(PageSize.A4, 40, 40, 50, 50);
        ByteArrayOutputStream flux = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, flux);
            document.open();

            Polices polices = new Polices(
                    new Font(Font.HELVETICA, 18, Font.BOLD),
                    new Font(Font.HELVETICA, 13, Font.BOLD),
                    new Font(Font.HELVETICA, 10, Font.NORMAL),
                    new Font(Font.HELVETICA, 9, Font.BOLD));

            document.add(new Paragraph(titreRapport + " — " + audit.getNom(), polices.titre()));
            document.add(new Paragraph(
                    "Référentiel " + audit.getReferentiel().getCode() + " — Entreprise " + audit.getEntreprise().getRaisonSociale(),
                    polices.normal()));
            document.add(new Paragraph(
                    "Début le " + audit.getDateDebut().format(FORMAT_DATE) + " — Statut " + audit.getStatut(),
                    polices.normal()));
            document.add(Chunk.NEWLINE);

            corps.ecrire(document, polices);

            document.close();
        } catch (DocumentException e) {
            throw new RapportGenerationException("Échec de génération du rapport PDF", e);
        }
        return flux.toByteArray();
    }

    private static PdfPCell celluleEntete(String texte, Font police) {
        PdfPCell cellule = new PdfPCell(new Phrase(texte, police));
        cellule.setHorizontalAlignment(Element.ALIGN_LEFT);
        cellule.setPadding(4);
        return cellule;
    }

    private static PdfPCell cellule(String texte, Font police) {
        PdfPCell cellule = new PdfPCell(new Phrase(texte, police));
        cellule.setPadding(4);
        return cellule;
    }
}
