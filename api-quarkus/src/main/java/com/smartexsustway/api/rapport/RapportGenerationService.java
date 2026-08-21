package com.smartexsustway.api.rapport;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.NonConforme;
import com.smartexsustway.api.domain.enums.FormatRapport;
import com.smartexsustway.api.domain.repository.ActionCorrectiveRepository;
import com.smartexsustway.api.domain.repository.NonConformeRepository;
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

/**
 * Module 12 — génération du rapport de synthèse d'une mission d'audit
 * (score global/par domaine + non-conformités), aux formats CSV et PDF.
 * Réutilise AuditScoreService (même calcul que le tableau de bord, RG32) :
 * le rapport ne doit jamais afficher un chiffre différent de l'écran.
 *
 * Seul le type SYNTHESE est implémenté pour l'instant — DETAILLE,
 * PLAN_ACTION et INDICE_FINANCEMENTS_VERTS restent à cadrer (voir
 * RapportResource, qui rejette explicitement ces types en 400).
 */
@ApplicationScoped
public class RapportGenerationService {

    private static final DateTimeFormatter FORMAT_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Inject AuditScoreService auditScoreService;
    @Inject NonConformeRepository nonConformeRepository;
    @Inject ActionCorrectiveRepository actionCorrectiveRepository;

    public byte[] genererSynthese(Audit audit, FormatRapport format) {
        AuditScoreDto score = auditScoreService.calculer(audit);
        List<NonConforme> nonConformites = nonConformeRepository.parAudit(audit.getId());

        return switch (format) {
            case CSV -> genererCsv(audit, score, nonConformites);
            case PDF -> genererPdf(audit, score, nonConformites);
            case EXCEL -> throw new IllegalArgumentException("Format EXCEL non encore supporté pour le rapport de synthèse");
        };
    }

    private byte[] genererCsv(Audit audit, AuditScoreDto score, List<NonConforme> nonConformites) {
        StringBuilder csv = new StringBuilder();
        csv.append("Rapport de synthèse — ").append(audit.getNom()).append('\n');
        csv.append("Référentiel;").append(audit.getReferentiel().getCode()).append('\n');
        csv.append("Entreprise;").append(audit.getEntreprise().getRaisonSociale()).append('\n');
        csv.append("Date de début;").append(audit.getDateDebut().format(FORMAT_DATE)).append('\n');
        csv.append("Statut;").append(audit.getStatut()).append('\n');
        csv.append('\n');

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
     * d'affichage (aucun impact sur le calcul lui-même).
     */
    private static String formaterScore(BigDecimal score) {
        return score.setScale(2, RoundingMode.HALF_UP).toString();
    }

    private byte[] genererPdf(Audit audit, AuditScoreDto score, List<NonConforme> nonConformites) {
        Document document = new Document(PageSize.A4, 40, 40, 50, 50);
        ByteArrayOutputStream flux = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, flux);
            document.open();

            Font titre = new Font(Font.HELVETICA, 18, Font.BOLD);
            Font sousTitre = new Font(Font.HELVETICA, 13, Font.BOLD);
            Font normal = new Font(Font.HELVETICA, 10, Font.NORMAL);
            Font enTeteTableau = new Font(Font.HELVETICA, 9, Font.BOLD);

            document.add(new Paragraph("Rapport de synthèse — " + audit.getNom(), titre));
            document.add(new Paragraph(
                    "Référentiel " + audit.getReferentiel().getCode() + " — Entreprise " + audit.getEntreprise().getRaisonSociale(),
                    normal));
            document.add(new Paragraph(
                    "Début le " + audit.getDateDebut().format(FORMAT_DATE) + " — Statut " + audit.getStatut(),
                    normal));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Score global", sousTitre));
            document.add(new Paragraph(
                    "Score : " + formaterScore(score.scoreGlobal()) + " / 5 — Évalués : " + score.nombreCriteresEvalues() + " / "
                            + score.nombreCriteresTotal() + " — En revue experte : " + score.nombreCriteresEnRevue()
                            + " — Non évalués : " + score.nombreCriteresNonEvalues(),
                    normal));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Score par domaine", sousTitre));
            PdfPTable tableDomaines = new PdfPTable(4);
            tableDomaines.setWidthPercentage(100);
            for (String entete : List.of("Domaine", "Score /5", "Évalués", "Total")) {
                tableDomaines.addCell(celluleEntete(entete, enTeteTableau));
            }
            for (AuditScoreDto.DomaineScoreDto d : score.domaines()) {
                tableDomaines.addCell(cellule(d.domaineNom() + " (" + d.domaineCode() + ")", normal));
                tableDomaines.addCell(cellule(formaterScore(d.score()), normal));
                tableDomaines.addCell(cellule(String.valueOf(d.nombreCriteresEvalues()), normal));
                tableDomaines.addCell(cellule(String.valueOf(d.nombreCriteresTotal()), normal));
            }
            document.add(tableDomaines);
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Non-conformités (" + nonConformites.size() + ")", sousTitre));
            if (nonConformites.isEmpty()) {
                document.add(new Paragraph("Aucune non-conformité détectée à ce stade de la mission.", normal));
            } else {
                PdfPTable tableNc = new PdfPTable(4);
                tableNc.setWidthPercentage(100);
                for (String entete : List.of("Critère", "Niveau", "Statut", "Actions correctives")) {
                    tableNc.addCell(celluleEntete(entete, enTeteTableau));
                }
                for (NonConforme nc : nonConformites) {
                    int nombreActions = actionCorrectiveRepository.parNonConforme(nc.getId()).size();
                    tableNc.addCell(cellule(nc.getEvaluation().getAuditCritere().getCritere().getCode() + " — " + nc.getTitre(), normal));
                    tableNc.addCell(cellule(nc.getNiveau().name(), normal));
                    tableNc.addCell(cellule(nc.getStatut().name(), normal));
                    tableNc.addCell(cellule(String.valueOf(nombreActions), normal));
                }
                document.add(tableNc);
            }

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
