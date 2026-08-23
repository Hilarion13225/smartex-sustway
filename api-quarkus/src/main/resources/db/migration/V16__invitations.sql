-- RG05 : jusqu'ici, ajouter un collaborateur exigeait qu'il possede deja
-- un compte Smartex Sustway (MembreEntrepriseResource.ajouter echouait en
-- 404 sinon) -- pas d'email d'invitation, pas de creation de compte a la
-- place de l'interesse. L'invitation porte desormais le role/site choisis
-- a l'avance : ils sont appliques automatiquement a l'acceptation.

CREATE TYPE statut_invitation AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REVOQUEE');

CREATE TABLE invitation (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id  UUID NOT NULL REFERENCES entreprise(id) ON DELETE CASCADE,
  email          VARCHAR(255) NOT NULL,
  role_id        UUID NOT NULL REFERENCES role(id),
  site_id        UUID REFERENCES site(id) ON DELETE SET NULL,
  token          VARCHAR(64) NOT NULL UNIQUE,
  invite_par_id  UUID NOT NULL REFERENCES utilisateur(id),
  statut         statut_invitation NOT NULL DEFAULT 'EN_ATTENTE',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expire_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_invitation_token ON invitation (token);
CREATE INDEX idx_invitation_entreprise ON invitation (entreprise_id);

COMMENT ON TABLE invitation IS 'RG05 -- invitation d''un collaborateur sans compte existant, role/site figes a l''envoi et appliques a l''acceptation.';
COMMENT ON COLUMN invitation.token IS 'Identifiant opaque (pas un JWT) : revocable en marquant la ligne REVOQUEE, sans liste de blocage.';
