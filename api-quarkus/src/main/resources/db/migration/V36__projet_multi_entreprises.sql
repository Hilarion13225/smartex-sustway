-- =====================================================================
-- Projet : auditer plusieurs organisations sur un même référentiel
-- =====================================================================
-- Une mission porte sur une seule organisation. Auditer un portefeuille —
-- les entreprises d'un bailleur, d'une filière, d'un programme — supposait
-- de créer les missions une à une, puis de les comparer de tête.
--
-- Un projet regroupe donc plusieurs organisations sous un même référentiel
-- et une même période. Il ne remplace pas les missions : il en crée une
-- par organisation et garde le lien, de sorte que chaque organisation
-- conserve sa mission, ses preuves et son score, et que la comparaison se
-- fasse sur des évaluations réellement indépendantes.
--
-- Le lien projet/organisation porte la mission créée pour elle : c'est ce
-- qui permet de suivre l'avancement du projet sans parcourir toutes les
-- missions de la plateforme.
-- =====================================================================

CREATE TABLE projet (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nom             varchar(200) NOT NULL,
    description     text,
    referentiel_id  uuid NOT NULL REFERENCES referentiel(id) ON DELETE RESTRICT,
    date_debut      date NOT NULL,
    date_fin        date,
    statut          varchar(20) NOT NULL DEFAULT 'EN_COURS',
    cree_par_id     uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT projet_statut_check CHECK (statut IN ('BROUILLON', 'EN_COURS', 'CLOTURE', 'ARCHIVE'))
);

CREATE INDEX idx_projet_referentiel ON projet (referentiel_id);

-- ON DELETE RESTRICT sur le référentiel, comme pour audit : un référentiel
-- servant de base à un projet ne doit pas disparaître sous lui.

CREATE TABLE projet_entreprise (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    projet_id     uuid NOT NULL REFERENCES projet(id) ON DELETE CASCADE,
    entreprise_id uuid NOT NULL REFERENCES entreprise(id) ON DELETE CASCADE,
    -- Mission créée pour cette organisation dans le cadre du projet. Nulle
    -- tant qu'elle n'a pas été générée ; conservée à null plutôt que la
    -- ligne supprimée si la mission est effacée, pour garder trace de
    -- l'organisation retenue au projet.
    audit_id      uuid REFERENCES audit(id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT projet_entreprise_unique UNIQUE (projet_id, entreprise_id)
);

CREATE INDEX idx_projet_entreprise_projet ON projet_entreprise (projet_id);

COMMENT ON TABLE projet IS
    'Campagne d''audit portant sur plusieurs organisations, sur un même référentiel.';
COMMENT ON TABLE projet_entreprise IS
    'Organisation retenue dans un projet, et la mission créée pour elle.';
