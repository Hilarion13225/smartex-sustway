# =====================================================================
# Test du pipeline complet d'evaluation IA (sous-lot 3, Phase D)
# entreprise -> abonnement -> audit -> upload document -> preuve -> evaluation IA
# =====================================================================

# Arrete le script des la premiere erreur au lieu de laisser les etapes
# suivantes s'enchainer sur des variables vides (ce qui produisait une
# cascade d'erreurs illisibles masquant la cause reelle).
$ErrorActionPreference = "Stop"

$base = "http://localhost:8080/api/v1"

Write-Host "`n=== 1. Inscription + connexion ===" -ForegroundColor Cyan
$email = "test.ia.$(Get-Random)@example.com"
$motDePasse = "motdepasse123"

$inscription = @{
    nom = "Test"
    prenom = "IA"
    email = $email
    motDePasse = $motDePasse
} | ConvertTo-Json
Invoke-RestMethod -Uri "$base/auth/inscription" -Method Post -Body $inscription -ContentType "application/json" | Out-Null

# Rappel : en mode dev, la verification email est court-circuitee (voir
# smartex.auth.verification-email-obligatoire=false en %dev) -> connexion
# immediate possible sans etape de verification.
$connexionBody = @{ email = $email; motDePasse = $motDePasse } | ConvertTo-Json
$connexion = Invoke-RestMethod -Uri "$base/auth/connexion" -Method Post -Body $connexionBody -ContentType "application/json"
$token = $connexion.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "Connecte : $email"

Write-Host "`n=== 2. Creation entreprise (formule Avancees) ===" -ForegroundColor Cyan
$entrepriseBody = @{
    raisonSociale = "Entreprise Test Pipeline IA"
    identifiantLegal = "RCCM-IA-$(Get-Random)"
    formuleCode = "AVANCEES"
    periodicite = "ANNUELLE"
} | ConvertTo-Json
$entrepriseResp = Invoke-RestMethod -Uri "$base/entreprises" -Method Post -Body $entrepriseBody -ContentType "application/json" -Headers $headers
$entrepriseId = $entrepriseResp.entreprise.id
Write-Host "Entreprise creee : $entrepriseId"

Write-Host "`n=== 3. Paiement de l'abonnement (stub) ===" -ForegroundColor Cyan
$paiementBody = @{ fournisseur = "PI_SPI" } | ConvertTo-Json
Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/abonnement/paiements" -Method Post -Body $paiementBody -ContentType "application/json" -Headers $headers | Out-Null
Write-Host "Abonnement actif"

Write-Host "`n=== 4. Creation de la mission d'audit ===" -ForegroundColor Cyan
$auditBody = @{
    referentielCode = "SMARTEX_SUSTWAY"
    nom = "Audit test pipeline IA"
    dateDebut = (Get-Date -Format "yyyy-MM-dd")
} | ConvertTo-Json
$auditResp = Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/audits" -Method Post -Body $auditBody -ContentType "application/json" -Headers $headers
$auditId = $auditResp.id
Write-Host "Audit cree : $auditId ($($auditResp.nombreCriteres) criteres)"

Write-Host "`n=== 5. Selection du critere GOUV-07 (politique anti-corruption) ===" -ForegroundColor Cyan
$criteres = Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/audits/$auditId/criteres" -Method Get -Headers $headers
$critereCible = $criteres | Where-Object { $_.critereCode -eq "GOUV-07" }
$auditCritereId = $critereCible.id
Write-Host "Critere : $($critereCible.critereCode) - $auditCritereId"

Write-Host "`n=== 6. Upload d'un document de preuve (texte brut) ===" -ForegroundColor Cyan
# Fichier texte brut plutôt qu'un faux PDF : un PDF nécessite une structure
# binaire valide (xref, trailer...) que Gemini pourrait refuser de parser en
# multimodal. Un .txt est par nature toujours valide, donc plus sûr pour ce
# premier test de bout en bout.
$cheminFichier = "$env:TEMP\politique-anti-corruption-test.txt"
[System.IO.File]::WriteAllText($cheminFichier, "Smartex Sustway - Politique de lutte contre la corruption.`nCette entreprise s'engage formellement a lutter contre toute forme de corruption. Un responsable de la conformite anti-corruption a ete nomme le 1er janvier 2026. Cette politique est signee par la direction generale et diffusee a l'ensemble des collaborateurs.")

# -Form (Invoke-RestMethod) n'existe qu'a partir de PowerShell 7 ; on
# construit ici le corps multipart/form-data a la main pour rester
# compatible avec Windows PowerShell 5.1 (celui installe par defaut).
$boundary = [System.Guid]::NewGuid().ToString()
$nomFichier = [System.IO.Path]::GetFileName($cheminFichier)
$contenuFichier = [System.IO.File]::ReadAllText($cheminFichier)

$corpsMultipart = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"fichier`"; filename=`"$nomFichier`"",
    "Content-Type: text/plain",
    "",
    $contenuFichier,
    "--$boundary--",
    ""
) -join "`r`n"

$documentResp = Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/documents" -Method Post -Body $corpsMultipart -ContentType "multipart/form-data; boundary=$boundary" -Headers $headers
$documentId = $documentResp.id
Write-Host "Document televerse : $documentId (scan : $($documentResp.statutScan))"

if ($documentResp.statutScan -ne "SAIN") {
    Write-Host "ARRET : le document n'est pas SAIN, impossible de continuer." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 7. Association du document au critere (preuve, RG15) ===" -ForegroundColor Cyan
$preuveBody = @{
    documentId = $documentId
    description = "Politique anti-corruption signee par la direction"
    type = "JUSTIFICATIF"
    auditCritereIds = @($auditCritereId)
} | ConvertTo-Json
$preuveResp = Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/audits/$auditId/preuves" -Method Post -Body $preuveBody -ContentType "application/json" -Headers $headers
Write-Host "Preuve creee : $($preuveResp.id)"

Write-Host "`n=== 8. LANCEMENT DE L'EVALUATION IA (Document -> Evidence -> Compliance) ===" -ForegroundColor Yellow
Write-Host "Appel a Gemini en cours, cela peut prendre quelques secondes..."
try {
    $evaluationResp = Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/audits/$auditId/criteres/$auditCritereId/evaluations" -Method Post -Headers $headers

    Write-Host "`n=== RESULTAT EVALUATION ===" -ForegroundColor Green
    $evaluationResp | ConvertTo-Json -Depth 5
} catch {
    Write-Host "`n=== ECHEC ===" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message }
    exit 1
}

if (-not $evaluationResp.revueExperteDeclenchee) {
    Write-Host "`nAucune revue experte declenchee (confiance IA suffisante) - test de la file arrete ici." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n=== 9. CREATION D'UN UTILISATEUR EXPERT DE TEST (rattachement direct en base) ===" -ForegroundColor Cyan
# Il n'existe pas encore d'endpoint pour inviter un second utilisateur avec
# un role choisi sur une entreprise existante (seul le createur devient
# automatiquement RESPONSABLE_ENTREPRISE a l'inscription) - rattachement
# fait ici directement via psql, pour les besoins de ce test uniquement.
$expertEmail = "expert.ia.$(Get-Random)@example.com"
$expertInscription = @{
    nom = "Expert"
    prenom = "RSE"
    email = $expertEmail
    motDePasse = $motDePasse
} | ConvertTo-Json
Invoke-RestMethod -Uri "$base/auth/inscription" -Method Post -Body $expertInscription -ContentType "application/json" | Out-Null
Write-Host "Utilisateur expert cree : $expertEmail"

$sqlRattachement = "INSERT INTO utilisateur_entreprise (utilisateur_id, entreprise_id, role_id) VALUES ((SELECT id FROM utilisateur WHERE email = '$expertEmail'), '$entrepriseId', (SELECT id FROM role WHERE code = 'EXPERT_REVIEWER'));"
docker exec smartex-postgres psql -U smartex -d smartex_sustway -c $sqlRattachement
Write-Host "Rattachement EXPERT_REVIEWER cree pour l'entreprise $entrepriseId"

$expertConnexionBody = @{ email = $expertEmail; motDePasse = $motDePasse } | ConvertTo-Json
$expertConnexion = Invoke-RestMethod -Uri "$base/auth/connexion" -Method Post -Body $expertConnexionBody -ContentType "application/json"
$expertHeaders = @{ Authorization = "Bearer $($expertConnexion.token)" }
Write-Host "Expert connecte"

Write-Host "`n=== 10. CONSULTATION DE LA FILE DE REVUE EXPERTE ===" -ForegroundColor Yellow
$file = Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/revues-expertes" -Method Get -Headers $expertHeaders
Write-Host "Revues en attente : $($file.Count)"
$revue = $file | Where-Object { $_.auditCritereId -eq $auditCritereId } | Select-Object -First 1
if (-not $revue) {
    Write-Host "ARRET : revue attendue introuvable dans la file." -ForegroundColor Red
    exit 1
}
$revueId = $revue.id
Write-Host "Revue trouvee : $revueId (statut $($revue.statut))"

Write-Host "`n=== 11. PRISE EN CHARGE DE LA REVUE ===" -ForegroundColor Yellow
$priseEnCharge = Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/revues-expertes/$revueId/prendre-en-charge" -Method Post -Headers $expertHeaders
Write-Host "Statut apres prise en charge : $($priseEnCharge.statut)"

Write-Host "`n=== 12. TRAITEMENT DE LA REVUE (confirmation par l'expert) ===" -ForegroundColor Yellow
$traiterBody = @{
    probabiliteFinale = 0.9
    commentaire = "Preuve verifiee manuellement par l'expert : document coherent et suffisant."
} | ConvertTo-Json
$revueTraitee = Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/revues-expertes/$revueId/traiter" -Method Post -Body $traiterBody -ContentType "application/json" -Headers $expertHeaders

Write-Host "`n=== RESULTAT REVUE TRAITEE ===" -ForegroundColor Green
$revueTraitee | ConvertTo-Json -Depth 5

Write-Host "`n=== 13. VERIFICATION DE L'EVALUATION APRES REVUE ===" -ForegroundColor Yellow
$evaluations = Invoke-RestMethod -Uri "$base/entreprises/$entrepriseId/audits/$auditId/criteres/$auditCritereId/evaluations" -Method Get -Headers $headers
Write-Host "`n=== EVALUATIONS APRES REVUE ===" -ForegroundColor Green
$evaluations | ConvertTo-Json -Depth 5
