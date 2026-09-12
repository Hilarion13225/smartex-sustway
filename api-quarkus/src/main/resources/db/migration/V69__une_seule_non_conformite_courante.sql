-- =====================================================================
-- Une seule non-conformité courante par critère — imposé par la base
-- =====================================================================
-- L'index unique PARTIEL est ce qui permet de concilier deux exigences qui
-- paraissaient contradictoires : garantir une non-conformité courante par
-- critère, et ne détruire aucune ligne historique.
--
-- Un index unique plein sur `audit_critere_id` aurait exigé de supprimer
-- ou déplacer les 17 lignes en excès. La clause `WHERE courante` fait
-- porter la contrainte sur le seul état actuel, en laissant coexister
-- autant de lignes historiques que nécessaire.
--
-- POINT DE NON-RETOUR. Une fois cet index posé, toute ré-analyse
-- produisant une non-conformité supplémentaire ÉCHOUERA si le code de
-- mise à jour n'est pas en place. Cette migration doit donc suivre la mise
-- en service de NonConformiteService dans sa version « courante unique »,
-- jamais la précéder.
-- =====================================================================

CREATE UNIQUE INDEX non_conforme_courante_unique
    ON non_conforme (audit_critere_id)
    WHERE courante;

COMMENT ON INDEX non_conforme_courante_unique IS
    'Une seule non-conformité courante par critère de mission. Les lignes historiques (courante = false) ne sont pas contraintes et restent conservées.';

-- Contrôle final, structurel et non numérique — pour la même raison qu'en
-- V68 : les données diffèrent d'une base à l'autre, l'invariant non.
DO $$
DECLARE
    courantes integer;
    criteres  integer;
BEGIN
    SELECT count(*)                         INTO courantes FROM non_conforme WHERE courante;
    SELECT count(DISTINCT audit_critere_id) INTO criteres   FROM non_conforme;

    IF courantes <> criteres THEN
        RAISE EXCEPTION 'Etat incoherent apres pose de l''index : % courantes pour % critere(s).',
            courantes, criteres;
    END IF;
END $$;
