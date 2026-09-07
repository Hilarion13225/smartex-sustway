package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Abonnement;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Projet;
import com.smartexsustway.api.domain.entity.ProjetEntreprise;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.repository.AbonnementRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.ProjetEntrepriseRepository;
import com.smartexsustway.api.domain.repository.ProjetRepository;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.mission.CreationMissionService;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.ProjetCreateRequest;
import com.smartexsustway.api.resource.dto.ProjetDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Projets d'audit : auditer plusieurs organisations sur un même référentiel.
 *
 * Réservé aux rôles à vision globale — un projet traverse les organisations,
 * il n'a pas de sens depuis le compte d'une seule d'entre elles.
 *
 * La création génère une mission par organisation en passant par
 * CreationMissionService, le même chemin que la création unitaire : la
 * composition du questionnaire et le gel de la criticité sectorielle
 * (RG34/RG35/RG37) sont donc identiques.
 */
@Path("/api/v1/projets")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({"SUPER_ADMIN", "ADMIN_AUDIT"})
public class ProjetResource {

    @Inject ProjetRepository projetRepository;
    @Inject ProjetEntrepriseRepository projetEntrepriseRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject ReferentielRepository referentielRepository;
    @Inject AbonnementRepository abonnementRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject CreationMissionService creationMissionService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister() {
        var projets = projetRepository.tous().stream()
                .map(p -> ProjetDto.depuis(p, (int) projetEntrepriseRepository.compterParProjet(p.getId())))
                .toList();
        return Response.ok(projets).build();
    }

    @GET
    @Path("/{id}")
    public Response detail(@PathParam("id") UUID id) {
        Projet projet = projetRepository.findById(id);
        if (projet == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(avecLignes(projet)).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response creer(@Valid ProjetCreateRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();

        Referentiel referentiel = referentielRepository.parCode(requete.referentielCode()).orElse(null);
        if (referentiel == null) {
            return erreur(400, "Référentiel inconnu : " + requete.referentielCode());
        }

        // Les organisations sont résolues avant toute écriture : un identifiant
        // inconnu doit faire échouer le projet entier plutôt que de le créer
        // amputé d'une organisation sans que personne ne s'en aperçoive.
        var organisations = new ArrayList<Entreprise>();
        for (UUID entrepriseId : requete.entrepriseIds()) {
            Entreprise entreprise = entrepriseRepository.findById(entrepriseId);
            if (entreprise == null) {
                return erreur(400, "Organisation inconnue : " + entrepriseId);
            }
            autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
            organisations.add(entreprise);
        }

        Projet projet = new Projet(requete.nom(), referentiel, requete.dateDebut());
        projet.setDescription(requete.description());
        projet.setDateFin(requete.dateFin());
        projet.setCreePar(utilisateurRepository.findById(utilisateurId));
        projetRepository.persist(projet);

        for (Entreprise entreprise : organisations) {
            UUID entrepriseId = entreprise.getId();

            ProjetEntreprise ligne = new ProjetEntreprise(projet, entreprise);
            projetEntrepriseRepository.persist(ligne);

            // RG20 : sans abonnement actif, l'organisation entre au projet mais
            // sa mission n'est pas créée — la refuser entièrement priverait le
            // projet d'une organisation qu'on veut suivre, et créer la mission
            // contournerait la règle. La ligne reste alors sans mission, ce que
            // le détail du projet montre explicitement.
            Abonnement abonnement = abonnementRepository.leplusRecentParEntreprise(entrepriseId).orElse(null);
            if (abonnement == null || !abonnement.estActif()) {
                continue;
            }

            var creee = creationMissionService.creer(entreprise, referentiel,
                    requete.nom(), requete.dateDebut(), requete.dateFin(), requete.description(),
                    abonnement, utilisateurRepository.findById(utilisateurId));
            ligne.setAudit(creee.audit());

            auditLogService.journaliser(utilisateurId, entrepriseId, "AUDIT_CREE", "audit",
                    creee.audit().getId());
        }

        auditLogService.journaliser(utilisateurId, null, "PROJET_CREE", "projet", projet.getId());

        return Response.status(Response.Status.CREATED)
                .entity(avecLignes(projet))
                .build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response supprimer(@PathParam("id") UUID id) {
        Projet projet = projetRepository.findById(id);
        if (projet == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        // Les missions créées ne sont pas supprimées : elles portent des
        // preuves et des évaluations propres à chaque organisation. Seul le
        // regroupement disparaît.
        projetRepository.delete(projet);
        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null, "PROJET_SUPPRIME",
                "projet", id);
        return Response.noContent().build();
    }

    /** Détail complet : le projet et, pour chaque organisation, sa mission. */
    private ProjetDto avecLignes(Projet projet) {
        List<ProjetEntreprise> lignes = projetEntrepriseRepository.parProjet(projet.getId());
        return ProjetDto.depuis(projet, lignes.size(), lignes.stream().map(l ->
                new ProjetDto.LigneDto(
                        l.getEntreprise().getId(),
                        l.getEntreprise().getRaisonSociale(),
                        l.getAudit() == null ? null : l.getAudit().getId(),
                        l.getAudit() == null ? null : l.getAudit().getNom(),
                        l.getAudit() == null ? null : l.getAudit().getStatut().name()
                )).toList());
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
