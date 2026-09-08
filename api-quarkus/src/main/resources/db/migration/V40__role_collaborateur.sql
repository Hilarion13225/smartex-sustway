-- =====================================================================
-- Rôle COLLABORATEUR — création seule, aucun rattachement
-- =====================================================================
-- L'architecture cible ne compte que deux rôles principaux, SUPER_ADMIN et
-- RESPONSABLE_ENTREPRISE, le collaborateur étant un utilisateur rattaché à
-- une entreprise avec des droits limités. Les rôles EMPLOYE et VISITEUR se
-- partagent aujourd'hui mal cette place : le premier peut déposer une
-- preuve, le second seulement consulter un rapport.
--
-- Cette migration crée le rôle et ses permissions SANS y rattacher
-- personne. Les cinq rôles existants continuent de fonctionner à
-- l'identique : rien ne change pour aucun utilisateur tant que la bascule
-- des rattachements n'a pas lieu, en phase 2.
--
-- Permissions retenues, d'après ce que le collaborateur doit pouvoir faire :
-- répondre aux questions qui lui sont attribuées et déposer les pièces
-- justificatives (preuve:deposer), consulter les éléments nécessaires à ses
-- tâches (rapport:consulter). Ce sont exactement celles d'EMPLOYE ; VISITEUR
-- n'en portait qu'une et gagnera donc le dépôt de preuve lors de la bascule.
--
-- Ce que cette migration NE fait PAS : aucune suppression, aucun rôle
-- retiré, aucune valeur d'ENUM touchée, aucun rattachement déplacé.
-- =====================================================================

INSERT INTO role (code, nom, description)
VALUES (
    'COLLABORATEUR',
    'Collaborateur',
    'Utilisateur rattaché à une entreprise : répond aux questions qui lui sont attribuées et dépose les pièces justificatives. Ne voit aucune autre entreprise.'
)
ON CONFLICT (code) DO NOTHING;

-- Permissions du collaborateur. La jointure sur les codes évite d'écrire des
-- identifiants en dur, et ON CONFLICT rend la migration rejouable.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
CROSS JOIN permission p
WHERE r.code = 'COLLABORATEUR'
  AND p.code IN ('preuve:deposer', 'rapport:consulter')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE role IS
    'Rôles de la plateforme. Cible : SUPER_ADMIN, RESPONSABLE_ENTREPRISE, COLLABORATEUR. ADMIN_AUDIT, EMPLOYE et VISITEUR sont conservés le temps de la migration pour la rendre réversible.';
