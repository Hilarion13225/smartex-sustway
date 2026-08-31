-- =====================================================================
-- CORRECTIF — Référentiel IFC/SFI : alignement sur le questionnaire réel
-- =====================================================================
-- V20 avait peuplé IFC/SFI avec 3 à 5 critères génériques par Performance
-- Standard (31 au total), rédigés sans source officielle précise. On
-- dispose maintenant du questionnaire réel utilisé par Smartex Expertises
-- (8 Normes de Performance, chacune avec un objectif et exactement 3
-- questions d'évaluation) : ce lot remplace les critères V20 par ceux-ci,
-- pour que la plateforme reflète le contenu métier réel plutôt qu'une
-- estimation. Nouvelle migration plutôt que modification de V20 : V20 a
-- déjà été appliquée (local + production) et Flyway interdit de modifier
-- une migration déjà exécutée (le checksum ne correspondrait plus).
--
-- Le libellé du critère reste une formulation déclarative (cohérent avec
-- les autres référentiels de la plateforme, utilisée dans les tableaux et
-- listes) ; la question associée reprend le texte réel, interrogatif,
-- fourni par Smartex Expertises — c'est ce texte qui est montré à
-- l'auditeur au moment de répondre.
--
-- Sans risque pour des données existantes : audit_critere.critere_id est
-- en ON DELETE RESTRICT (voir V1), donc le DELETE ci-dessous échouerait
-- s'il existait déjà une mission réelle sur IFC/SFI — ce n'est pas le cas
-- (référentiel ajouté par V20 dans le lot précédent, aucune mission créée
-- dessus depuis).
-- =====================================================================

DELETE FROM critere
WHERE domaine_id IN (
  SELECT d.id FROM domaine d
  JOIN referentiel r ON r.id = d.referentiel_id
  WHERE r.code = 'IFC_SFI'
);

-- --- Objectif réel de chaque Norme de Performance (remplace la
--     description générique "Performance Standard N" posée par V20) ----

UPDATE domaine d
SET description = v.objectif
FROM (VALUES
  ('PS1', 'Piloter la durabilité via un Système de Gestion Environnementale et Sociale (SGES).'),
  ('PS2', 'Promouvoir des relations de travail équitables, sûres et saines.'),
  ('PS3', 'Minimiser l''empreinte écologique et optimiser la consommation de ressources.'),
  ('PS4', 'Éviter ou minimiser les risques pesant sur la santé et la sécurité des populations environnantes.'),
  ('PS5', 'Anticiper et atténuer les impacts économiques et physiques de la perte de terres.'),
  ('PS6', 'Protéger les écosystèmes et maintenir les services écosystémiques.'),
  ('PS7', 'Respecter les droits, la dignité et la culture des communautés autochtones.'),
  ('PS8', 'Protéger le patrimoine culturel matériel et immatériel contre les impacts négatifs.')
) AS v(code, objectif)
WHERE d.code = v.code
AND d.referentiel_id = (SELECT id FROM referentiel WHERE code = 'IFC_SFI');

-- --- Critères réels (24 — 3 par Norme de Performance) ------------------

INSERT INTO critere (domaine_id, code, libelle, criticite_id, applicabilite, actif)
SELECT d.id, v.code, v.libelle, ct.id, 'GENERALE'::type_applicabilite, true
FROM (VALUES
  ('PS1', 'PS1-01', 'Système de gestion environnementale et sociale (SGES) formel et proportionné aux risques', 'ELEVEE'),
  ('PS1', 'PS1-02', 'Évaluation d''impact environnemental et social (EIES) avant tout nouveau projet majeur', 'ELEVEE'),
  ('PS1', 'PS1-03', 'Mécanisme formel de gestion des plaintes accessible aux communautés et tiers', 'MOYENNE'),

  ('PS2', 'PS2-01', 'Politique RH garantissant la liberté d''association et interdisant discrimination, travail des enfants et travail forcé', 'CRITIQUE'),
  ('PS2', 'PS2-02', 'Mécanisme de recours interne anonyme et sécurisé pour les employés', 'MOYENNE'),
  ('PS2', 'PS2-03', 'Procédures de santé et sécurité au travail documentées, appliquées et auditées', 'CRITIQUE'),

  ('PS3', 'PS3-01', 'Bilan des émissions de gaz à effet de serre réalisé et mis à jour', 'MOYENNE'),
  ('PS3', 'PS3-02', 'Programmes de réduction de la consommation d''eau, d''énergie et de matières premières', 'MOYENNE'),
  ('PS3', 'PS3-03', 'Tri, stockage sécurisé et filières agréées pour les déchets dangereux et non dangereux', 'ELEVEE'),

  ('PS4', 'PS4-01', 'Analyse des risques des infrastructures et équipements pour la sécurité du public', 'ELEVEE'),
  ('PS4', 'PS4-02', 'Plan d''urgence face aux accidents industriels majeurs, partagé avec autorités et populations', 'ELEVEE'),
  ('PS4', 'PS4-03', 'Formation des agents de sécurité aux droits humains et à l''usage proportionné de la force', 'CRITIQUE'),

  ('PS5', 'PS5-01', 'Identification des déplacements physiques ou économiques liés à l''acquisition de terres', 'MOYENNE'),
  ('PS5', 'PS5-02', 'Plan de réinstallation négocié de manière juste avec les personnes affectées', 'CRITIQUE'),
  ('PS5', 'PS5-03', 'Restauration ou amélioration des conditions de subsistance des populations déplacées', 'ELEVEE'),

  ('PS6', 'PS6-01', 'Présence des sites d''exploitation en zone protégée ou à haute valeur de biodiversité', 'ELEVEE'),
  ('PS6', 'PS6-02', 'Application de la hiérarchie d''atténuation (éviter, minimiser, restaurer, compenser)', 'ELEVEE'),
  ('PS6', 'PS6-03', 'Exigence de certifications de gestion durable pour les matières premières naturelles (FSC, RSPO...)', 'MOYENNE'),

  ('PS7', 'PS7-01', 'Identification des territoires ou ressources de peuples autochtones affectés par les opérations', 'ELEVEE'),
  ('PS7', 'PS7-02', 'Consentement libre, informé et préalable (CLIP) obtenu des communautés autochtones', 'CRITIQUE'),
  ('PS7', 'PS7-03', 'Plan de développement co-conçu avec les peuples autochtones pour un partage équitable des bénéfices', 'ELEVEE'),

  ('PS8', 'PS8-01', 'Investigations archéologiques ou historiques préalables sur la présence de sites culturels', 'MOYENNE'),
  ('PS8', 'PS8-02', 'Procédure formalisée de découverte fortuite (« chance find ») de vestiges archéologiques', 'FAIBLE'),
  ('PS8', 'PS8-03', 'Accord de partage des bénéfices en cas d''usage commercial du patrimoine culturel ou des savoirs traditionnels', 'FAIBLE')
) AS v(domaine_code, code, libelle, criticite)
JOIN referentiel r ON r.code = 'IFC_SFI'
JOIN domaine d ON d.referentiel_id = r.id AND d.code = v.domaine_code
JOIN criticite ct ON ct.code = v.criticite::niveau_criticite;

-- --- Questions réelles (texte fourni par Smartex Expertises, verbatim) -

INSERT INTO question (critere_id, code, libelle, type, ordre, obligatoire)
SELECT c.id, c.code || '-Q1', v.question, 'FERMEE', 1, true
FROM (VALUES
  ('PS1-01', 'L''entreprise dispose-t-elle d''un SGES formel, proportionné à la taille et aux risques de ses activités ?'),
  ('PS1-02', 'Des évaluations d''impact environnemental et social (EIES) sont-elles menées avant le lancement de tout nouveau projet majeur ?'),
  ('PS1-03', 'Existe-t-il un mécanisme formel de gestion des plaintes accessible aux communautés locales et aux tiers ?'),

  ('PS2-01', 'L''entreprise possède-t-elle une politique de ressources humaines claire, garantissant le droit d''association et interdisant strictement toute forme de discrimination, de travail des enfants ou de travail forcé ?'),
  ('PS2-02', 'Un mécanisme de recours interne (boîte à idées, délégués) permet-il aux employés de remonter leurs griefs de manière anonyme et sécurisée ?'),
  ('PS2-03', 'Des procédures strictes de Santé et Sécurité au Travail (SST) sont-elles documentées, appliquées et auditées régulièrement ?'),

  ('PS3-01', 'L''entreprise réalise-t-elle et met-elle à jour un bilan d''émissions de Gaz à Effet de Serre (GES) ?'),
  ('PS3-02', 'Existe-t-il des programmes spécifiques pour réduire la consommation d''eau, d''énergie et de matières premières ?'),
  ('PS3-03', 'Les déchets (dangereux et non dangereux) sont-ils triés, stockés de manière sécurisée et confiés à des filières de recyclage agréées ?'),

  ('PS4-01', 'Les infrastructures et équipements de l''entreprise font-ils l''objet d''analyses de risques pour s''assurer qu''ils ne menacent pas la sécurité du public (ex. trafic routier, effondrements) ?'),
  ('PS4-02', 'L''entreprise a-t-elle mis en place un plan d''urgence face aux accidents industriels majeurs, partagé et testé avec les autorités et populations locales ?'),
  ('PS4-03', 'Si des agents de sécurité (internes ou externes) sont déployés, ont-ils reçu une formation relative aux droits de l''homme et à l''usage proportionné de la force ?'),

  ('PS5-01', 'L''acquisition de terres pour les activités de l''entreprise a-t-elle engendré des déplacements physiques ou économiques de populations ?'),
  ('PS5-02', '(Si oui) Un Plan de Réinstallation (PR) ou un Cadre de Politique de Réinstallation a-t-il été négocié de manière juste avec les personnes affectées ?'),
  ('PS5-03', 'Les conditions de subsistance et les revenus des populations déplacées ont-ils été restaurés ou améliorés après l''installation ?'),

  ('PS6-01', 'Les sites d''exploitation sont-ils situés dans ou à proximité immédiate de zones protégées ou de zones à haute valeur de biodiversité ?'),
  ('PS6-02', 'L''entreprise applique-t-elle la hiérarchie des mesures d''atténuation (Éviter, Minimiser, Restaurer, Compenser) face aux impacts sur la faune et la flore ?'),
  ('PS6-03', 'En cas d''approvisionnement en matières premières naturelles (bois, produits agricoles), l''entreprise exige-t-elle des certifications de gestion durable (FSC, RSPO, etc.) ?'),

  ('PS7-01', 'Les opérations de l''entreprise affectent-elles directement ou indirectement des territoires ou des ressources détenus par des peuples autochtones ?'),
  ('PS7-02', '(Si oui) L''entreprise a-t-elle obtenu le Consentement Libre, Informé et Préalable (CLIP) des communautés concernées avant le démarrage du projet ?'),
  ('PS7-03', 'Un plan de développement dédié aux peuples autochtones a-t-il été co-conçu pour s''assurer qu''ils partagent équitablement les bénéfices du projet ?'),

  ('PS8-01', 'L''entreprise a-t-elle mené des investigations archéologiques ou historiques préalables pour identifier la présence de sites culturels ou sacrés ?'),
  ('PS8-02', 'Existe-t-il une procédure formalisée de « découverte fortuite » (chance find procedure) au cas où des vestiges archéologiques seraient mis au jour durant des travaux ?'),
  ('PS8-03', 'Si l''entreprise utilise le patrimoine culturel ou les savoirs traditionnels de communautés locales à des fins commerciales, un accord de partage des bénéfices a-t-il été formalisé ?')
) AS v(critere_code, question)
JOIN critere c ON c.code = v.critere_code
JOIN domaine d ON d.id = c.domaine_id
JOIN referentiel r ON r.id = d.referentiel_id AND r.code = 'IFC_SFI';
