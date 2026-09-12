-- Clôture et archivage d'un plan d'action.
--
-- Deux gestes distincts, et la distinction est le point de cette migration :
--
--   CLOTURE  = le plan est arrivé à son terme. Il est gelé.
--   ARCHIVE  = le plan est retiré sans avoir été mené à terme. Il est gelé.
--
-- Les confondre ferait perdre l'information qui compte : un plan abandonné
-- ne se relit pas comme un plan accompli. C'est aussi ce qui remplace la
-- suppression physique, qui emporterait les actions par CASCADE et effacerait
-- la trace du travail engagé.
--
-- `statut_plan` n'est utilisé que par `plan_action` — contrairement à
-- `statut_action_corrective`, partagé avec `action_corrective`. Lui ajouter
-- une valeur n'a donc aucun effet sur les actions correctives.
--
-- Aucune ligne existante n'est touchée : `plan_action` est vide.

ALTER TYPE statut_plan ADD VALUE IF NOT EXISTS 'ARCHIVE';

-- Qui a gelé le plan, quand, et pourquoi.
--
-- Le motif est porté par la table plutôt que par le seul journal parce qu'il
-- doit se lire avec le plan : un plan clôturé sans motif lisible ne se relit
-- pas six mois plus tard. Même raison que `axe_amelioration.motif_rejet`.
--
-- Les trois colonnes servent aux deux gestes de gel — le nom retenu est celui
-- du geste principal.
ALTER TABLE plan_action
    ADD COLUMN IF NOT EXISTS motif_cloture text,
    ADD COLUMN IF NOT EXISTS cloture_par   uuid REFERENCES utilisateur (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cloture_le    timestamptz;

-- Un plan clôturé porte son motif. La base le tient, pas seulement le code —
-- miroir exact de `axe_rejet_motive`.
--
-- La contrainte ne vise que CLOTURE : l'archivage reste possible sans motif,
-- et « ARCHIVE » ne peut de toute façon pas être référencée dans la même
-- transaction que l'ALTER TYPE qui vient de l'introduire.
ALTER TABLE plan_action
    ADD CONSTRAINT plan_cloture_motivee
        CHECK (statut <> 'CLOTURE'
            OR (motif_cloture IS NOT NULL AND btrim(motif_cloture) <> ''));

COMMENT ON COLUMN plan_action.motif_cloture IS
    'Pourquoi le plan a été clôturé ou archivé. Obligatoire à la clôture.';
COMMENT ON COLUMN plan_action.cloture_par IS
    'Qui a gelé le plan (clôture ou archivage).';
