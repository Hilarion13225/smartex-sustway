-- =====================================================================
-- FIX — Colonnes nécessaires à la 2FA (RG36, CDC §5.4)
-- =====================================================================
-- telephone       : nécessaire pour la méthode SMS (aucun champ existant
--                    ne permettait de savoir où envoyer le code).
-- deuxfa_secret    : secret TOTP (base32) pour la méthode application
--                    d'authentification (Google Authenticator, etc.).
--                    Nul pour la méthode SMS, qui n'a pas besoin de secret
--                    persistant (codes à usage unique, portés par un JWT
--                    signé à durée de vie courte — voir JwtService).
-- =====================================================================

ALTER TABLE utilisateur ADD COLUMN telephone VARCHAR(20);
ALTER TABLE utilisateur ADD COLUMN deuxfa_secret VARCHAR(64);
