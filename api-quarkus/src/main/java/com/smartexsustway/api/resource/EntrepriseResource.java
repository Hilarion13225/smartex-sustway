package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Abonnement;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.FormuleAbonnement;
import com.smartexsustway.api.domain.entity.Role;
import com.smartexsustway.api.domain.entity.Secteur;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.enums.PeriodiciteFacturation;
import com.smartexsustway.api.domain.enums.TailleEntreprise;
import com.smartexsustway.api.domain.repository.AbonnementRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.FormuleAbonnementRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.SecteurRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.EntrepriseAvecAbonnementDto;
import com.smartexsustway.api.resource.dto.AbonnementDto;
import com.smartexsustway.api.resource.dto.EntrepriseCreateRequest;
import com.smartexsustway.api.resource.dto.EntrepriseDto;
import com.smartexsustway.api.resource.dto.EntrepriseUpdateRequest;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * RG02 : identité légale unique.
 * RG24 : une entreprise ne peut être créée sans formule d'abonnement valide
 * — Entreprise et Abonnement sont créés ensemble, dans la même transaction
 * (abonnement.entreprise_id est une FK obligatoire, donc l'un ne peut pas
 * exister sans l'autre — voir Abonnement.java).
 * RG25 : la formule FREE est un mode de démonstration, sans création
 * d'entités métier possible — refusée explicitement ici.
 * Isolation multi-tenant (exigence §1.4) : chaque endpoint qui accède aux
 * données d'une entreprise passe par AutorisationService.exigerAccesEntreprise
 * plutôt que de faire confiance à l'id fourni dans l'URL.
 */
@Path("/api/v1/entreprises")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class EntrepriseResource {

    @Inject EntrepriseRepository entrepriseRepository;
    @Inject SecteurRepository secteurRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject FormuleAbonnementRepository formuleAbonnementRepository;
    @Inject AbonnementRepository abonnementRepository;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response mesEntreprises() {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        List<EntrepriseDto> resultat = utilisateurEntrepriseRepository.parUtilisateur(utilisateurId).stream()
                .map(UtilisateurEntreprise::getEntreprise)
                .distinct()
                .map(EntrepriseDto::depuis)
                .toList();
        return Response.ok(resultat).build();
    }

    @GET
    @Path("/{id}")
    public Response detail(@PathParam("id") UUID id) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), id);

        Entreprise entreprise = entrepriseRepository.findById(id);
        if (entreprise == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(EntrepriseDto.depuis(entreprise)).build();
    }

    /**
     * Mise à jour de la fiche entreprise, réservée au responsable de
     * l'entreprise et au personnel Smartex : un collaborateur rattaché
     * (EMPLOYE) a bien accès aux données, mais pas à l'identité légale.
     */
    @PUT
    @Path("/{id}")
    @Transactional
    public Response modifier(@PathParam("id") UUID id, @Valid EntrepriseUpdateRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, id);
        autorisationService.exigerRoleSurEntreprise(
                utilisateurId, id, AutorisationService.ROLES_ADMINISTRATION_ENTREPRISE);

        Entreprise entreprise = entrepriseRepository.findById(id);
        if (entreprise == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        if (entrepriseRepository.identifiantLegalExistePourUneAutre(requete.identifiantLegal(), id)) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(new ErreurDto("Une autre entreprise porte déjà cet identifiant légal"))
                    .build();
        }

        entreprise.setRaisonSociale(requete.raisonSociale());
        entreprise.setIdentifiantLegal(requete.identifiantLegal());

        if (requete.secteurCode() == null) {
            entreprise.setSecteur(null);
        } else {
            Secteur secteur = secteurRepository.parCode(requete.secteurCode())
                    .orElseThrow(() -> new BadRequestException("Secteur inconnu : " + requete.secteurCode()));
            entreprise.setSecteur(secteur);
        }

        if (requete.taille() == null) {
            entreprise.setTaille(null);
        } else {
            try {
                entreprise.setTaille(TailleEntreprise.valueOf(requete.taille()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Taille d'entreprise invalide : " + requete.taille());
            }
        }

        auditLogService.journaliser(utilisateurId, id, "ENTREPRISE_MODIFIEE", "entreprise", id);

        return Response.ok(EntrepriseDto.depuis(entreprise)).build();
    }

    @POST
    @Transactional
    public Response creer(@Valid EntrepriseCreateRequest requete) {
        if (entrepriseRepository.identifiantLegalExiste(requete.identifiantLegal())) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(new ErreurDto("Une entreprise avec cet identifiant légal existe déjà"))
                    .build();
        }

        FormuleAbonnement formule = formuleAbonnementRepository.parCode(requete.formuleCode())
                .orElseThrow(() -> new BadRequestException("Formule d'abonnement inconnue : " + requete.formuleCode()));

        // RG25 : "aucune action de création, modification ou suppression n'est
        // autorisée sur les entités métier" en formule Free — refusé ici plutôt
        // que silencieusement ignoré, pour que le frontend puisse informer
        // clairement l'utilisateur (le compte Free reste un mode de démo).
        if (formule.estFree()) {
            throw new ForbiddenException(
                    "La formule Free ne permet pas la création d'entreprise (RG25) — passez en formule Standard ou Avancées.");
        }

        PeriodiciteFacturation periodicite;
        try {
            periodicite = requete.periodicite() == null
                    ? null
                    : PeriodiciteFacturation.valueOf(requete.periodicite());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Périodicité invalide : " + requete.periodicite() + " (attendu MENSUELLE ou ANNUELLE)");
        }
        if (periodicite == null) {
            throw new BadRequestException("La périodicité (MENSUELLE ou ANNUELLE) est obligatoire pour une formule payante");
        }

        Entreprise entreprise = new Entreprise(requete.raisonSociale(), requete.identifiantLegal());

        if (requete.secteurCode() != null) {
            Secteur secteur = secteurRepository.parCode(requete.secteurCode())
                    .orElseThrow(() -> new BadRequestException("Secteur inconnu : " + requete.secteurCode()));
            entreprise.setSecteur(secteur);
        }
        if (requete.taille() != null) {
            entreprise.setTaille(TailleEntreprise.valueOf(requete.taille()));
        }

        entrepriseRepository.persist(entreprise);

        // RG24 : l'abonnement est créé dans la même transaction que l'entreprise —
        // il n'existe jamais d'entreprise sans formule associée, même un court instant.
        Abonnement abonnement = new Abonnement(entreprise, formule, periodicite, LocalDate.now());
        abonnementRepository.persist(abonnement);

        // L'utilisateur qui crée l'entreprise en devient responsable (RG05).
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurId);
        Role roleResponsable = roleRepository.parCode("RESPONSABLE_ENTREPRISE")
                .orElseThrow(() -> new IllegalStateException(
                        "Rôle RESPONSABLE_ENTREPRISE absent — vérifier les seeds (database/seeds/001_seed_reference_data.sql)"));

        UtilisateurEntreprise rattachement = new UtilisateurEntreprise(utilisateur, entreprise, null, roleResponsable);
        utilisateurEntrepriseRepository.persist(rattachement);

        auditLogService.journaliser(utilisateurId, entreprise.getId(), "ENTREPRISE_CREEE", "entreprise", entreprise.getId());
        auditLogService.journaliser(utilisateurId, entreprise.getId(), "ABONNEMENT_CREE", "abonnement", abonnement.getId());

        var reponse = new EntrepriseAvecAbonnementDto(EntrepriseDto.depuis(entreprise), AbonnementDto.depuis(abonnement));
        return Response.status(Response.Status.CREATED).entity(reponse).build();
    }
}
