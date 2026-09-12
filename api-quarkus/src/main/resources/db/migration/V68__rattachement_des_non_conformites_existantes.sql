-- =====================================================================
-- Rattachement des 39 non-conformités existantes — SEULE MIGRATION DE
-- DONNÉES de ce lot
-- =====================================================================
-- Elle n'écrit QUE dans deux colonnes créées en V67 (`audit_critere_id`,
-- `courante`). Aucune donnée métier préexistante n'est modifiée : ni le
-- titre, ni la description, ni le niveau, ni le risque attendu, ni le
-- statut — les 39 lignes restent OUVERTE. Aucune ligne n'est supprimée.
--
-- État constaté sur la base de développement avant migration :
--
--     39 non-conformités
--     22 critères porteurs
--     11 groupes dupliqués
--     17 lignes en excès
--     0 orphelin, 0 égalité de created_at à l'intérieur d'un groupe
--
-- Ces chiffres ne sont PAS vérifiés par la migration, et c'est délibéré :
-- elle s'exécute aussi sur la base de test, sur celle de chaque
-- développeur et sur la production, qui ne portent pas les mêmes données.
-- Seuls des invariants structurels sont contrôlés (voir §3).
--
-- Le départage se fait sur `created_at DESC, id DESC`. Le second critère
-- n'est pas décoratif : sans lui, deux non-conformités créées dans la même
-- transaction porteraient un horodatage identique et la « plus récente »
-- serait indéterminée. Aucune égalité de ce type n'existe sur la base de
-- développement, mais rien ne garantit qu'il en aille de même ailleurs.
-- =====================================================================

-- --- 1. Identité logique -----------------------------------------------
--
-- Dérivation déterministe et sans perte : chaque non-conformité pointe une
-- évaluation, chaque évaluation porte un `audit_critere_id` NOT NULL.

UPDATE non_conforme nc
SET audit_critere_id = e.audit_critere_id
FROM evaluation e
WHERE e.id = nc.evaluation_id
  AND nc.audit_critere_id IS NULL;

-- --- 2. Désignation de la ligne courante -------------------------------
--
-- La plus récente de chaque critère représente l'état actuel. Les
-- précédentes deviennent historiques — conservées, consultables, mais
-- hors des lectures métier par défaut.

WITH classees AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY audit_critere_id
               ORDER BY created_at DESC, id DESC
           ) AS rang
    FROM non_conforme
    WHERE audit_critere_id IS NOT NULL
)
UPDATE non_conforme nc
SET courante = (classees.rang = 1)
FROM classees
WHERE classees.id = nc.id;

-- --- 3. Vérification des invariants ------------------------------------
--
-- Les invariants vérifiés ici sont STRUCTURELS, jamais numériques.
--
-- La tentation était d'écrire « 39 lignes attendues, 22 courantes, 17
-- historiques » — les chiffres constatés sur la base de développement. Ce
-- serait faux : une migration s'exécute aussi sur la base de test, sur
-- celle de chaque développeur et sur la production, qui ne portent pas les
-- mêmes données. Une assertion numérique y échouerait sans qu'aucun défaut
-- réel n'existe.
--
-- Ce qui doit être vrai partout, en revanche :
--
--   * aucune non-conformité n'est restée sans critère ;
--   * chaque critère porteur a exactement une ligne courante ;
--   * le nombre de courantes égale le nombre de critères porteurs.
--
-- Le dernier point est le plus fort : il dit à la fois qu'aucun critère
-- n'a deux courantes et qu'aucun n'en a zéro.

DO $$
DECLARE
    total          integer;
    courantes      integer;
    historiques    integer;
    orphelines     integer;
    criteres       integer;
    doublons       integer;
BEGIN
    SELECT count(*) INTO total FROM non_conforme;

    SELECT count(*) INTO orphelines FROM non_conforme WHERE audit_critere_id IS NULL;
    IF orphelines > 0 THEN
        RAISE EXCEPTION '% non-conformite(s) sans critere rattache : le rattachement a echoue.', orphelines;
    END IF;

    SELECT count(*)                          INTO courantes   FROM non_conforme WHERE courante;
    SELECT count(*)                          INTO historiques FROM non_conforme WHERE NOT courante;
    SELECT count(DISTINCT audit_critere_id)  INTO criteres     FROM non_conforme;

    -- Une courante par critere porteur, ni plus ni moins.
    IF courantes <> criteres THEN
        RAISE EXCEPTION 'Partition incoherente : % courantes pour % critere(s) porteur(s).', courantes, criteres;
    END IF;

    -- L'invariant que V69 imposera structurellement. Le vérifier ici donne
    -- un message lisible ; laissé à V69, il se manifesterait par un échec
    -- de création d'index bien moins parlant.
    SELECT count(*) INTO doublons FROM (
        SELECT audit_critere_id FROM non_conforme
        WHERE courante
        GROUP BY audit_critere_id
        HAVING count(*) > 1
    ) x;

    IF doublons > 0 THEN
        RAISE EXCEPTION '% critere(s) portent plusieurs non-conformites courantes.', doublons;
    END IF;

    -- Aucune ligne supprimee : total = courantes + historiques, et les deux
    -- sous-ensembles sont disjoints par construction.
    IF total <> courantes + historiques THEN
        RAISE EXCEPTION 'Comptage incoherent : % lignes, % courantes, % historiques.', total, courantes, historiques;
    END IF;

    RAISE NOTICE 'Non-conformites : % conservees, % courantes, % historiques, % critere(s) porteur(s).',
        total, courantes, historiques, criteres;
END $$;
