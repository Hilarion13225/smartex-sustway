-- =====================================================================
-- Sous-domaines et pondération portée par le référentiel
-- =====================================================================
-- La grille d'analyse réelle (« Grille d'Analyse et d'Evaluation RSE ESG
-- DD ») découpe chaque domaine en sous-domaines — dix-huit pour la seule
-- grille de durabilité — et fixe un coefficient de pondération par
-- question, de 1 à 3. Le modèle ne connaissait ni l'un ni l'autre.
--
-- Le coefficient n'existait que sur `audit_critere`, avec 1.0 pour valeur
-- par défaut et aucun code pour le renseigner : toutes les missions ont
-- donc été notées à pondération uniforme, et le « score pondéré » de RG32
-- était en fait une moyenne simple. Le coefficient devient une propriété
-- du critère, recopiée dans la mission à sa création — la mission garde sa
-- copie figée (RG34/RG35), faire évoluer un référentiel ne doit pas
-- réécrire le score d'un audit déjà rendu.
-- =====================================================================

CREATE TABLE sous_domaine (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    domaine_id  uuid NOT NULL REFERENCES domaine(id) ON DELETE CASCADE,
    code        varchar(30) NOT NULL,
    nom         varchar(300) NOT NULL,
    description text,
    ordre       integer NOT NULL DEFAULT 0,
    CONSTRAINT sous_domaine_unique UNIQUE (domaine_id, code)
);

CREATE INDEX idx_sous_domaine_domaine ON sous_domaine (domaine_id, ordre);

COMMENT ON TABLE sous_domaine IS
    'Regroupement intermédiaire d''un domaine (ex. « A) Information financière et conseil d''administration »).';

-- Rattachement facultatif : tous les référentiels n'ont pas de
-- sous-domaines — les grilles SFI et PRI n'en comportent aucun.
ALTER TABLE critere
  ADD COLUMN sous_domaine_id uuid REFERENCES sous_domaine(id) ON DELETE SET NULL;

CREATE INDEX idx_critere_sous_domaine ON critere (sous_domaine_id);

-- Pondération du critère dans son référentiel. Même type que la colonne
-- correspondante d'audit_critere, dont elle constitue désormais la source.
ALTER TABLE critere
  ADD COLUMN coefficient_ponderation numeric(3,1) NOT NULL DEFAULT 1.0;

COMMENT ON COLUMN critere.coefficient_ponderation IS
    'Poids du critère dans le score du référentiel (1 à 3 dans les grilles Smartex). Recopié dans audit_critere à la création d''une mission.';
