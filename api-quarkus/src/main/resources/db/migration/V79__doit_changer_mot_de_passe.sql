-- V79 : flag de changement de mot de passe obligatoire
-- Posé à la création d'un compte par invitation (mot de passe temporaire).
-- Retiré après le premier changement de mot de passe.
ALTER TABLE utilisateur ADD COLUMN doit_changer_mot_de_passe BOOLEAN NOT NULL DEFAULT FALSE;
