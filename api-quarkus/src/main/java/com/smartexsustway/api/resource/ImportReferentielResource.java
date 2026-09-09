package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.ImportReferentiel;
import com.smartexsustway.api.referentiel.ImportReferentielService;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.ImportReferentielDto;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.IOException;
import java.nio.file.Files;
import java.util.UUID;

/**
 * Import assisté d'un référentiel (module 4, back-office).
 *
 * Réservé au personnel interne : le référentiel est commun à toutes les
 * organisations, il n'appartient à aucun tenant, et aucun utilisateur
 * d'entreprise n'y écrit — pas davantage par un import que par l'écran
 * d'administration. Même garde que le reste du catalogue depuis la phase 3B :
 * {@code @RolesAllowed("SUPER_ADMIN")}, la permission
 * {@code referentiel:administrer} restant portée par ce seul rôle actif.
 *
 * L'IA ne publie jamais. Ce que cette ressource permet s'arrête à la
 * génération d'un brouillon ; la validation et la publication passent par les
 * chemins existants, et le déclencheur de V57 refuse la publication d'une
 * version portant du contenu proposé et non accepté.
 */
@Path("/api/v1/referentiels/imports")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class ImportReferentielResource {

    @Inject ImportReferentielService importService;
    @Inject TenantContext tenantContext;

    /**
     * Reçoit un fichier de référentiel.
     *
     * Le contrôle est synchrone — il faut répondre tout de suite si le
     * fichier est refusé —, l'extraction ne l'est pas et fera l'objet d'un
     * appel distinct. Séparer les deux évite qu'un dépôt reste suspendu le
     * temps d'une lecture qui peut durer.
     */
    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @RolesAllowed("SUPER_ADMIN")
    public Response deposer(@RestForm("fichier") FileUpload fichier) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();

        if (fichier == null) {
            return erreur(400, "Aucun fichier reçu (champ 'fichier' attendu)");
        }

        byte[] contenu;
        try {
            contenu = Files.readAllBytes(fichier.uploadedFile());
        } catch (IOException e) {
            return erreur(500, "Échec de lecture du fichier reçu");
        }

        try {
            var cree = importService.recevoir(contenu, fichier.fileName(),
                    fichier.contentType(), utilisateurId);
            return Response.status(Response.Status.CREATED)
                    .entity(ImportReferentielDto.depuis(cree.importReferentiel(),
                            cree.doublonsPossibles()))
                    .build();
        } catch (ImportReferentielService.FichierRefuseException e) {
            return erreur(e.statutHttp(), e.getMessage());
        }
    }

    @GET
    @RolesAllowed("SUPER_ADMIN")
    public Response lister() {
        var imports = importService.tous().stream().map(ImportReferentielDto::depuis).toList();
        return Response.ok(imports).build();
    }

    @GET
    @Path("/{importId}")
    @RolesAllowed("SUPER_ADMIN")
    public Response consulter(@PathParam("importId") UUID importId) {
        return Response.ok(ImportReferentielDto.depuis(trouver(importId))).build();
    }

    /**
     * Récupère le fichier source tel qu'il a été reçu.
     *
     * Il est conservé même quand l'extraction échoue : comprendre pourquoi
     * elle a échoué suppose de pouvoir rouvrir le fichier qui l'a fait
     * échouer.
     */
    @GET
    @Path("/{importId}/fichier")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    @RolesAllowed("SUPER_ADMIN")
    public Response telechargerSource(@PathParam("importId") UUID importId) {
        ImportReferentiel importReferentiel = trouver(importId);
        byte[] contenu = importService.fichierSource(importReferentiel);
        return Response.ok(contenu)
                .type(importReferentiel.getTypeMime())
                .header("Content-Disposition",
                        "attachment; filename=\"" + importReferentiel.getNomFichier() + "\"")
                .build();
    }

    private ImportReferentiel trouver(UUID importId) {
        ImportReferentiel importReferentiel = importService.parId(importId);
        if (importReferentiel == null) {
            throw new NotFoundException("Import introuvable : " + importId);
        }
        return importReferentiel;
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
