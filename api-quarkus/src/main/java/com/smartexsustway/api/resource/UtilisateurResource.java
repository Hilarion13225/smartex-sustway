package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.ChangerMotDePasseRequest;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.ProfilUpdateRequest;
import com.smartexsustway.api.resource.dto.UtilisateurDto;
import com.smartexsustway.api.security.PasswordService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/v1/utilisateurs")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class UtilisateurResource {

    @Inject
    UtilisateurRepository utilisateurRepository;

    @Inject
    PasswordService passwordService;

    @Inject
    TenantContext tenantContext;

    @GET
    @Path("/moi")
    public Response moi() {
        Utilisateur utilisateur = utilisateurRepository.findById(tenantContext.utilisateurCourantId());
        if (utilisateur == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(UtilisateurDto.depuis(utilisateur)).build();
    }

    /**
     * Profil & sécurité — chaque compte modifie ses propres informations,
     * quel que soit son rôle. Volontairement limité à nom/prénom/téléphone :
     * l'email n'est pas modifiable ici (RG36 le lie à la vérification du
     * compte), le mot de passe a son propre endpoint ({@link #changerMotDePasse}).
     */
    @PUT
    @Path("/moi")
    @Transactional
    public Response modifierProfil(@Valid ProfilUpdateRequest requete) {
        Utilisateur utilisateur = utilisateurRepository.findById(tenantContext.utilisateurCourantId());
        if (utilisateur == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        utilisateur.setNom(requete.nom());
        utilisateur.setPrenom(requete.prenom());
        utilisateur.setTelephone(requete.telephone());

        return Response.ok(UtilisateurDto.depuis(utilisateur)).build();
    }

    /**
     * Changement de mot de passe pour un compte déjà connecté — distinct du
     * mot de passe oublié (AuthResource, non authentifié) : ici, l'ancien
     * mot de passe est exigé pour prouver que la session n'a pas été volée.
     */
    @PUT
    @Path("/moi/mot-de-passe")
    @Transactional
    public Response changerMotDePasse(@Valid ChangerMotDePasseRequest requete) {
        Utilisateur utilisateur = utilisateurRepository.findById(tenantContext.utilisateurCourantId());
        if (utilisateur == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        if (!passwordService.verifier(requete.ancienMotDePasse(), utilisateur.getMotDePasseHash())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErreurDto("Mot de passe actuel incorrect"))
                    .build();
        }

        utilisateur.setMotDePasseHash(passwordService.hacher(requete.nouveauMotDePasse()));

        return Response.noContent().build();
    }
}
