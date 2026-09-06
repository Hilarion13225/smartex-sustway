-- =====================================================================
-- Référentiel IFC/SFI : alignement strict sur le questionnaire fourni
-- =====================================================================
-- V21 avait posé 24 critères, exactement 3 par Norme de Performance. La
-- version du questionnaire fournie depuis en compte 25, réparties de
-- façon inégale (4 pour NP2 et NP3, 2 pour NP8) : ce lot ajoute les
-- quatre critères absents et retire du questionnaire les trois qui n'y
-- figurent plus.
--
-- Les critères retirés sont désactivés (actif = false) et non supprimés.
-- Ce sont des exigences SFI valides, seulement hors du périmètre retenu :
-- CritereRepository.applicables() filtre sur actif = true, ils cessent
-- donc d'entrer dans la composition des questionnaires (RG34), tandis que
-- ReferentielResource.criteres() continue de les exposer au back-office,
-- qui peut les réactiver sans nouvelle migration.
--
-- Les libellés existants ne sont pas retouchés : seule la composition du
-- référentiel change ici.
--
-- Nouvelle migration plutôt que modification de V21, déjà appliquée —
-- Flyway en vérifie le checksum.
-- =====================================================================

-- --- Critères présents au questionnaire et absents du référentiel ------
--
-- Les codes prolongent la numérotation de leur Norme ; l'ordre d'affichage
-- suivant le code (CritereRepository), ces critères apparaissent en fin de
-- Norme et non à la position qu'ils occupent dans le document source.

INSERT INTO critere (domaine_id, code, libelle, criticite_id, applicabilite, actif)
SELECT d.id, v.code, v.libelle, ct.id, 'GENERALE'::type_applicabilite, true
FROM (VALUES
  ('PS2', 'PS2-04', 'Contrat de travail écrit précisant droits, salaire, horaires et conditions pour chaque employé', 'ELEVEE'),

  ('PS3', 'PS3-04', 'Suivi régulier des effluents liquides et des émissions atmosphériques au regard des limites légales et sectorielles', 'ELEVEE'),
  ('PS3', 'PS3-05', 'Recours à des produits chimiques hautement toxiques ou interdits par les conventions internationales', 'CRITIQUE'),

  ('PS8', 'PS8-04', 'Restriction d''accès des communautés aux sites sacrés, religieux ou à forte valeur culturelle', 'MOYENNE')
) AS v(domaine_code, code, libelle, criticite)
JOIN referentiel r ON r.code = 'IFC_SFI'
JOIN domaine d ON d.referentiel_id = r.id AND d.code = v.domaine_code
JOIN criticite ct ON ct.code = v.criticite::niveau_criticite;

-- --- Questions associées (texte du questionnaire, verbatim) ------------

INSERT INTO question (critere_id, code, libelle, type, ordre, obligatoire)
SELECT c.id, c.code || '-Q1', v.question, 'FERMEE', 1, true
FROM (VALUES
  ('PS2-04', 'Les employés disposent-ils tous d''un contrat écrit stipulant clairement leurs droits, salaires, horaires et conditions de travail ?'),

  ('PS3-04', 'Les effluents liquides et les émissions atmosphériques font-ils l''objet d''un suivi régulier par rapport aux limites légales et sectorielles ?'),
  ('PS3-05', 'Utilisez-vous des produits chimiques classés comme hautement toxiques ou interdits par les conventions internationales ?'),

  ('PS8-04', 'Le projet restreint-il l''accès des communautés à des sites sacrés, religieux ou à forte valeur culturelle et historique ?')
) AS v(critere_code, question)
JOIN critere c ON c.code = v.critere_code
JOIN domaine d ON d.id = c.domaine_id
JOIN referentiel r ON r.id = d.referentiel_id AND r.code = 'IFC_SFI';

-- --- Critères hors du questionnaire retenu ----------------------------
--
-- PS3-01 : le bilan des émissions de gaz à effet de serre n'est pas repris
--          par le questionnaire, qui traite les rejets sous l'angle du
--          suivi réglementaire (PS3-04).
-- PS8-01 : les investigations archéologiques préalables ne sont plus
--          demandées ; seule subsiste la procédure de découverte fortuite
--          (PS8-02).
-- PS8-03 : le partage des bénéfices tirés du patrimoine culturel sort du
--          périmètre, recentré sur l'accès des communautés (PS8-04).

UPDATE critere c
SET actif = false
FROM domaine d, referentiel r
WHERE c.domaine_id = d.id
  AND d.referentiel_id = r.id
  AND r.code = 'IFC_SFI'
  AND c.code IN ('PS3-01', 'PS8-01', 'PS8-03');
