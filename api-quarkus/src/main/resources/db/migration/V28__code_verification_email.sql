-- =====================================================================
-- Activation de compte par code à usage unique (OTP)
-- =====================================================================
-- L'activation passait par un lien signé valable 24 heures, ouvert depuis
-- la boîte mail. Elle se fait désormais par un code à six chiffres, valable
-- trois minutes, saisi sur la plateforme : l'utilisateur reste dans le
-- parcours d'inscription au lieu d'en sortir, et la fenêtre d'exposition
-- d'un email intercepté tombe de 24 heures à 3 minutes.
--
-- Le code est stocké haché, jamais en clair : c'est un identifiant
-- d'activation au même titre qu'un mot de passe, et une fuite de la base
-- permettrait sinon d'activer n'importe quel compte en attente.
--
-- `tentatives` borne les essais sur un même code : six chiffres se
-- devinent en 10^6 coups, ce qu'un script épuiserait bien avant les trois
-- minutes sans ce compteur.
-- =====================================================================

CREATE TABLE code_verification_email (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id  uuid NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    code_hash       text NOT NULL,
    expire_le       timestamptz NOT NULL,
    tentatives      smallint NOT NULL DEFAULT 0,
    consomme_le     timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Un seul code vivant par compte : la génération d'un nouveau code consomme
-- les précédents, et la vérification cherche le plus récent.
CREATE INDEX idx_code_verification_utilisateur
    ON code_verification_email (utilisateur_id, created_at DESC);

COMMENT ON TABLE code_verification_email IS
    'Codes à usage unique d''activation de compte (RG36). Le code est haché ; sa durée de vie est courte (3 min).';
