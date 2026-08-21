# =====================================================================
# Test du back-office CRUD referentiel/domaine/critere (Phase F)
# Cree un mini-referentiel de A a Z : referentiel -> domaine -> critere,
# puis modifie chaque niveau, pour valider les 3 nouvelles ressources
# ReferentielResource (POST/PUT), DomaineResource, CritereCreation/
# ModificationResource.
#
# N'appelle jamais Gemini (aucun cout de quota).
# =====================================================================

$ErrorActionPreference = "Stop"
$base = "http://localhost:8080/api/v1"
$motDePasse = "motdepasse123"

function New-Utilisateur($prenom) {
    $email = "$($prenom.ToLower()).backoffice.$(Get-Random)@example.com"
    $body = @{ nom = "Test"; prenom = $prenom; email = $email; motDePasse = $motDePasse } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/auth/inscription" -Method Post -Body $body -ContentType "application/json" | Out-Null
    return $email
}

function Connecter($email) {
    $body = @{ email = $email; motDePasse = $motDePasse } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$base/auth/connexion" -Method Post -Body $body -ContentType "application/json"
    return @{ Authorization = "Bearer $($resp.token)" }
}

Write-Host "`n=== 1. Utilisateur responsable + entreprise (pour rattacher l'admin) ===" -ForegroundColor Cyan
$email = New-Utilisateur "Responsable"
$headers = Connecter $email
$entrepriseBody = @{
    raisonSociale = "Entreprise Test Backoffice"
    identifiantLegal = "RCCM-BO-$(Get-Random)"
    formuleCode = "STANDARD"
    periodicite = "ANNUELLE"
} | ConvertTo-Json
$entrepriseResp = Invoke-RestMethod -Uri "$base/entreprises" -Method Post -Body $entrepriseBody -ContentType "application/json" -Headers $headers
$entrepriseId = $entrepriseResp.entreprise.id
Write-Host "Entreprise creee : $entrepriseId"

Write-Host "`n=== 2. Creation d'un utilisateur SUPER_ADMIN de test (rattachement direct en base) ===" -ForegroundColor Cyan
$adminEmail = New-Utilisateur "Admin"
$sqlRattachement = "INSERT INTO utilisateur_entreprise (utilisateur_id, entreprise_id, role_id) VALUES ((SELECT id FROM utilisateur WHERE email = '$adminEmail'), '$entrepriseId', (SELECT id FROM role WHERE code = 'SUPER_ADMIN'));"
docker exec smartex-postgres psql -U smartex -d smartex_sustway -c $sqlRattachement
$adminHeaders = Connecter $adminEmail
Write-Host "Admin connecte : $adminEmail"

$suffixe = Get-Random
$referentielCode = "TEST_BACKOFFICE_$suffixe"
$domaineCode = "DOM-01"
$critereCode = "CRIT-01"

Write-Host "`n=== 3. Creation du referentiel ===" -ForegroundColor Yellow
$referentielBody = @{
    code = $referentielCode
    nom = "Referentiel de test back-office"
    type = "SMARTEX"
    description = "Cree par le script de test"
    version = "0.1"
} | ConvertTo-Json
$referentielResp = Invoke-RestMethod -Uri "$base/referentiels" -Method Post -Body $referentielBody -ContentType "application/json" -Headers $adminHeaders
Write-Host "Referentiel cree :"
$referentielResp | ConvertTo-Json

Write-Host "`n=== 4. Modification du referentiel (nom + version) ===" -ForegroundColor Yellow
$referentielUpdateBody = @{ nom = "Referentiel de test back-office (modifie)"; version = "0.2" } | ConvertTo-Json
$referentielModifie = Invoke-RestMethod -Uri "$base/referentiels/$referentielCode" -Method Put -Body $referentielUpdateBody -ContentType "application/json" -Headers $adminHeaders
Write-Host "Referentiel modifie :"
$referentielModifie | ConvertTo-Json

Write-Host "`n=== 5. Creation du domaine ===" -ForegroundColor Yellow
$domaineBody = @{ code = $domaineCode; nom = "Domaine de test"; description = "Premier domaine"; ordre = 1 } | ConvertTo-Json
$domaineResp = Invoke-RestMethod -Uri "$base/referentiels/$referentielCode/domaines" -Method Post -Body $domaineBody -ContentType "application/json" -Headers $adminHeaders
Write-Host "Domaine cree :"
$domaineResp | ConvertTo-Json

Write-Host "`n=== 6. Modification du domaine (ordre) ===" -ForegroundColor Yellow
$domaineUpdateBody = @{ ordre = 2 } | ConvertTo-Json
$domaineModifie = Invoke-RestMethod -Uri "$base/referentiels/$referentielCode/domaines/$domaineCode" -Method Put -Body $domaineUpdateBody -ContentType "application/json" -Headers $adminHeaders
Write-Host "Domaine modifie :"
$domaineModifie | ConvertTo-Json

Write-Host "`n=== 7. Creation du critere (criticite ELEVEE) ===" -ForegroundColor Yellow
$critereBody = @{
    code = $critereCode
    libelle = "Critere de test back-office"
    description = "Premier critere"
    applicabilite = "GENERALE"
    criticiteCode = "ELEVEE"
} | ConvertTo-Json
$critereResp = Invoke-RestMethod -Uri "$base/referentiels/$referentielCode/domaines/$domaineCode/criteres" -Method Post -Body $critereBody -ContentType "application/json" -Headers $adminHeaders
$critereId = $critereResp.id
Write-Host "Critere cree :"
$critereResp | ConvertTo-Json

Write-Host "`n=== 8. Modification du critere (libelle + criticite CRITIQUE) ===" -ForegroundColor Yellow
$critereUpdateBody = @{ libelle = "Critere de test back-office (modifie)"; criticiteCode = "CRITIQUE" } | ConvertTo-Json
$critereModifie = Invoke-RestMethod -Uri "$base/referentiels/criteres/$critereId" -Method Put -Body $critereUpdateBody -ContentType "application/json" -Headers $adminHeaders
Write-Host "Critere modifie :"
$critereModifie | ConvertTo-Json

Write-Host "`n=== 9. Verification via la liste des criteres du referentiel ===" -ForegroundColor Yellow
$listeCriteres = Invoke-RestMethod -Uri "$base/referentiels/$referentielCode/criteres" -Method Get -Headers $headers
$critereFinal = $listeCriteres | Where-Object { $_.code -eq $critereCode }
Write-Host "Critere retrouve dans la liste :"
$critereFinal | ConvertTo-Json

Write-Host "`n=== 10. Desactivation du critere (jamais de suppression, RG14) ===" -ForegroundColor Yellow
$desactivationBody = @{ actif = $false } | ConvertTo-Json
Invoke-RestMethod -Uri "$base/referentiels/criteres/$critereId" -Method Put -Body $desactivationBody -ContentType "application/json" -Headers $adminHeaders | Out-Null
$listeApresDesactivation = Invoke-RestMethod -Uri "$base/referentiels/$referentielCode/criteres" -Method Get -Headers $headers
$critereEncoreVisible = $listeApresDesactivation | Where-Object { $_.code -eq $critereCode }

Write-Host "`n=== RESULTAT ===" -ForegroundColor Green
Write-Host "Referentiel nom apres modification : $($referentielModifie.nom)"
Write-Host "Domaine ordre apres modification    : $($domaineModifie.ordre)"
Write-Host "Critere libelle apres modification  : $($critereFinal.libelle)"
Write-Host "Critere criticite apres modification: $($critereFinal.criticite)  (attendu : CRITIQUE)"
Write-Host "Critere visible apres desactivation : $(if ($critereEncoreVisible) { 'OUI (BUG - devrait etre absent, actif=false)' } else { 'NON (correct - GET criteres filtre actif=true)' })"

if ($referentielModifie.nom -eq "Referentiel de test back-office (modifie)" -and
    $domaineModifie.ordre -eq 2 -and
    $critereFinal.criticite -eq "CRITIQUE" -and
    -not $critereEncoreVisible) {
    Write-Host "`nTEST REUSSI : creation et modification a tous les niveaux (referentiel/domaine/critere) fonctionnent correctement." -ForegroundColor Green
} else {
    Write-Host "`nTEST EN ECHEC : resultats inattendus, voir le detail ci-dessus." -ForegroundColor Red
}
