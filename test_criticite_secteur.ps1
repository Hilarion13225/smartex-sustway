# =====================================================================
# Test de la criticite variable par secteur (RG37, Phase F)
# entreprise (secteur AGRO_INDUSTRIE) -> audit "avant" -> override
# SUPER_ADMIN sur GOUV-07 -> audit "apres" -> comparaison -> suppression
# de l'override -> audit "retour" -> verification
#
# N'appelle jamais Gemini (aucun cout de quota) : ce test porte uniquement
# sur la resolution deterministe de la criticite, pas sur le pipeline IA.
# =====================================================================

$ErrorActionPreference = "Stop"
$base = "http://localhost:8080/api/v1"
$motDePasse = "motdepasse123"
$secteurCode = "AGRO_INDUSTRIE"

function New-Utilisateur($prenom) {
    $email = "$($prenom.ToLower()).criticite.$(Get-Random)@example.com"
    $body = @{ nom = "Test"; prenom = $prenom; email = $email; motDePasse = $motDePasse } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/auth/inscription" -Method Post -Body $body -ContentType "application/json" | Out-Null
    return $email
}

function Connecter($email) {
    $body = @{ email = $email; motDePasse = $motDePasse } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$base/auth/connexion" -Method Post -Body $body -ContentType "application/json"
    return @{ Authorization = "Bearer $($resp.token)" }
}

function Creer-Audit($entrepriseId, $headers, $nom) {
    $body = @{ referentielCode = "SMARTEX_SUSTWAY"; nom = $nom; dateDebut = (Get-Date -Format "yyyy-MM-dd") } | ConvertTo-Json
    $auditResp = Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/audits" -Method Post -Body $body -ContentType "application/json" -Headers $headers
    $criteres = Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/audits/$($auditResp.id)/criteres" -Method Get -Headers $headers
    $gouv07 = $criteres | Where-Object { $_.critereCode -eq "GOUV-07" }
    return $gouv07.criticite
}

Write-Host "`n=== 1. Utilisateur responsable + entreprise (secteur $secteurCode) ===" -ForegroundColor Cyan
$email = New-Utilisateur "Responsable"
$headers = Connecter $email
Write-Host "Connecte : $email"

$entrepriseBody = @{
    raisonSociale = "Entreprise Test Criticite Secteur"
    identifiantLegal = "RCCM-CRIT-$(Get-Random)"
    secteurCode = $secteurCode
    formuleCode = "STANDARD"
    periodicite = "ANNUELLE"
} | ConvertTo-Json
$entrepriseResp = Invoke-RestMethod -Uri "$base/entreprises" -Method Post -Body $entrepriseBody -ContentType "application/json" -Headers $headers
$entrepriseId = $entrepriseResp.entreprise.id
Write-Host "Entreprise creee : $entrepriseId"

$paiementBody = @{ fournisseur = "PI_SPI" } | ConvertTo-Json
Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/abonnement/paiements" -Method Post -Body $paiementBody -ContentType "application/json" -Headers $headers | Out-Null
Write-Host "Abonnement actif"

Write-Host "`n=== 2. Audit AVANT override (baseline) ===" -ForegroundColor Yellow
$criticiteAvant = Creer-Audit $entrepriseId $headers "Audit avant override"
Write-Host "Criticite GOUV-07 (avant) : $criticiteAvant"

Write-Host "`n=== 3. Creation d'un utilisateur SUPER_ADMIN de test (rattachement direct en base) ===" -ForegroundColor Cyan
$adminEmail = New-Utilisateur "Admin"
$sqlRattachement = "INSERT INTO utilisateur_entreprise (utilisateur_id, entreprise_id, role_id) VALUES ((SELECT id FROM utilisateur WHERE email = '$adminEmail'), '$entrepriseId', (SELECT id FROM role WHERE code = 'SUPER_ADMIN'));"
docker exec smartex-postgres psql -U smartex -d smartex_sustway -c $sqlRattachement
$adminHeaders = Connecter $adminEmail
Write-Host "Admin connecte : $adminEmail"

Write-Host "`n=== 4. Recuperation de l'id referentiel du critere GOUV-07 ===" -ForegroundColor Cyan
$referentielCriteres = Invoke-RestMethod -Uri "$base/referentiels/SMARTEX_SUSTWAY/criteres" -Method Get -Headers $adminHeaders
$gouv07Ref = $referentielCriteres | Where-Object { $_.code -eq "GOUV-07" }
$critereId = $gouv07Ref.id
Write-Host "Critere GOUV-07 : $critereId (criticite generale : $($gouv07Ref.criticite))"

Write-Host "`n=== 5. Pose d'une surcharge CRITIQUE pour le secteur $secteurCode ===" -ForegroundColor Yellow
$overrideBody = @{ secteurCode = $secteurCode; criticiteCode = "CRITIQUE" } | ConvertTo-Json
$overrideResp = Invoke-RestMethod -Uri "$base/referentiels/criteres/$critereId/criticite-secteur" -Method Put -Body $overrideBody -ContentType "application/json" -Headers $adminHeaders
Write-Host "Override posee :"
$overrideResp | ConvertTo-Json

Write-Host "`n=== 6. Consultation des overrides pour ce critere ===" -ForegroundColor Cyan
$liste = Invoke-RestMethod -Uri "$base/referentiels/criteres/$critereId/criticite-secteur" -Method Get -Headers $adminHeaders
$liste | ConvertTo-Json -Depth 5

Write-Host "`n=== 7. Audit APRES override ===" -ForegroundColor Yellow
$criticiteApres = Creer-Audit $entrepriseId $headers "Audit apres override"
Write-Host "Criticite GOUV-07 (apres) : $criticiteApres"

Write-Host "`n=== 8. Suppression de l'override ===" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$base/referentiels/criteres/$critereId/criticite-secteur/$secteurCode" -Method Delete -Headers $adminHeaders | Out-Null
Write-Host "Override supprimee"

Write-Host "`n=== 9. Audit APRES suppression (retour a la normale) ===" -ForegroundColor Yellow
$criticiteRetour = Creer-Audit $entrepriseId $headers "Audit apres suppression override"
Write-Host "Criticite GOUV-07 (retour) : $criticiteRetour"

Write-Host "`n=== RESULTAT ===" -ForegroundColor Green
Write-Host "Avant override   : $criticiteAvant"
Write-Host "Apres override   : $criticiteApres  (attendu : CRITIQUE)"
Write-Host "Apres suppression: $criticiteRetour  (attendu : identique a 'avant' = $criticiteAvant)"

if ($criticiteApres -eq "CRITIQUE" -and $criticiteRetour -eq $criticiteAvant -and $criticiteAvant -ne "CRITIQUE") {
    Write-Host "`nTEST REUSSI : la criticite varie bien selon le secteur (RG37), et l'audit 'avant' n'a pas ete retroactivement modifie." -ForegroundColor Green
} else {
    Write-Host "`nTEST EN ECHEC : resultats inattendus, voir le detail ci-dessus." -ForegroundColor Red
}
