# =====================================================================
# Cree un compte SUPER_ADMIN de test et archive le referentiel de test
# TEST_BACKOFFICE_629131061, pour qu'il disparaisse du menu de creation
# d'audit.
# =====================================================================

$ErrorActionPreference = "Stop"
$base = "http://localhost:8090/api/v1"
$motDePasse = "motdepasse123"

# Remplacez par l'id d'une entreprise existante si besoin (n'importe
# laquelle convient : ce compte n'a pas besoin d'appartenir a CETTE
# entreprise pour agir sur le referentiel, c'est une donnee globale).
$entrepriseId = "ab396a0d-0ecc-456e-9dc4-9079b8cd4114"

$adminEmail = "admin.archivage.$(Get-Random)@example.com"
$inscriptionBody = @{ nom = "Admin"; prenom = "Test"; email = $adminEmail; motDePasse = $motDePasse } | ConvertTo-Json
Invoke-RestMethod -Uri "$base/auth/inscription" -Method Post -Body $inscriptionBody -ContentType "application/json" | Out-Null
Write-Host "Utilisateur admin cree : $adminEmail"

$sqlRattachement = "INSERT INTO utilisateur_entreprise (utilisateur_id, entreprise_id, role_id) VALUES ((SELECT id FROM utilisateur WHERE email = '$adminEmail'), '$entrepriseId', (SELECT id FROM role WHERE code = 'SUPER_ADMIN'));"
docker exec smartex-postgres psql -U smartex -d smartex_sustway -c $sqlRattachement

$connexionBody = @{ email = $adminEmail; motDePasse = $motDePasse } | ConvertTo-Json
$connexion = Invoke-RestMethod -Uri "$base/auth/connexion" -Method Post -Body $connexionBody -ContentType "application/json"
$adminHeaders = @{ Authorization = "Bearer $($connexion.token)" }
Write-Host "Admin connecte"

$archiveBody = @{ statut = "ARCHIVE" } | ConvertTo-Json
$resultat = Invoke-RestMethod -Uri "$base/referentiels/TEST_BACKOFFICE_629131061" -Method Put -Body $archiveBody -ContentType "application/json" -Headers $adminHeaders

Write-Host "`n=== Referentiel archive ===" -ForegroundColor Green
$resultat | ConvertTo-Json
