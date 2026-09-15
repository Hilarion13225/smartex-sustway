package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.enums.StatutGenerique;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.domain.enums.TypeReferentiel;
import com.smartexsustway.api.domain.repository.CritereRepository;
import java.util.UUID;
import jakarta.validation.Valid;
import com.smartexsustway.api.resource.dto.ReferentielVersionDto;
import com.smartexsustway.api.resource.dto.PublierVersionRequestDto;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.domain.repository.ReferentielVersionRepository;
import com.smartexsustway.api.domain.repository.DomaineRepository;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.resource.dto.CritereDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.ReferentielCreateRequestDto;
import com.smartexsustway.api.resource.dto.ReferentielDto;
import com.smartexsustway.api.resource.dto.ReferentielUpdateRequestDto;
import com.smartexsustway.api.referentiel.VersionReferentielService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Lecture du référentiel (RG07/RG08/RG09) : liste des référentiels et de
 * leurs critères — accessible à tout utilisateur authentifié. Les
 * opérations d'écriture (création/modification, module 4 — back-office)
 * sont réservées à SUPER_ADMIN. La prévisualisation du questionnaire
 * dynamique par entreprise (RG34) vit dans QuestionnaireResource —
 * volontairement séparée de cette classe pour suivre le même schéma que
 * AuditResource/SiteResource/AbonnementResource (préfixe complet déclaré
 * au niveau de la classe, jamais mélangé à des routes non imbriquées sous
 * /entreprises).
 *
 * Volontairement pas de DELETE sur cette ressource ni sur DomaineResource/
 * CritereCreationResource/CritereModificationResource : supprimer un
 * référentiel, un domaine ou un critère déjà référencé par des audits
 * (audit_critere, evaluation...) casserait l'historique (RG14). Seule la
 * désactivation (statut/actif) est exposée — pattern déjà prévu par le
 * modèle de données existant depuis la phase A.
 */
@Path("/api/v1/referentiels")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class ReferentielResource {

    @Inject ReferentielRepository referentielRepository;
    @Inject CritereRepository critereRepository;
    @Inject DomaineRepository domaineRepository;
    @Inject ReferentielVersionRepository referentielVersionRepository;
    @Inject VersionReferentielService versionService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;
    @Inject AutorisationService autorisationService;

    @GET
    public Response lister() {
        var referentiels = referentielRepository.listAll().stream().map(ReferentielDto::depuis).toList();
        return Response.ok(referentiels).build();
    }

    /**
     * Contenu de la version de travail d'un référentiel.
     *
     * <p>Un référentiel {@code ARCHIVE} n'est plus au catalogue : son contenu
     * cesse d'être servi à l'utilisateur ordinaire, et reste ouvert au
     * personnel interne — qui doit pouvoir l'inspecter, le corriger ou le
     * republier. Archiver retire de l'offre sans rendre aveugle celui qui
     * administre.
     *
     * <p>Ce que cette garde protège concrètement : les référentiels archivés
     * du catalogue portent des critères et des exigences dont aucune source
     * documentaire ni validation humaine n'est enregistrée
     * ({@code texte_source}, {@code localisation} et {@code validee_par} sont
     * tous nuls). Les servir au fil du catalogue revenait à présenter comme
     * établi un contenu que personne n'a confronté à un document officiel.
     *
     * <p>Les autres statuts sont inchangés — {@code INACTIF} et
     * {@code SUSPENDU} n'emportent aujourd'hui aucune restriction de lecture,
     * et leur en donner une dépasserait la décision prise.
     */
    @GET
    @Path("/{code}/criteres")
    public Response criteres(@PathParam("code") String code) {
        Referentiel referentiel = trouverParCode(code);

        // estAccesGlobalActif couvre SUPER_ADMIN et ADMIN_AUDIT — ce dernier
        // étant INACTIF et non attribuable (V44), cela revient aujourd'hui à
        // SUPER_ADMIN seul. Passer par le service d'autorisation plutôt que
        // par un test de rôle écrit ici garde la décision au même endroit que
        // toutes les autres.
        if (referentiel.getStatut() == StatutGenerique.ARCHIVE
                && !autorisationService.estAccesGlobalActif(tenantContext.utilisateurCourantId())) {
            return erreur(403, "Le référentiel " + referentiel.getCode()
                    + " est archivé : son contenu n'est plus proposé au catalogue");
        }

        // Contenu de la version de travail : brouillon s'il y en a un, sinon
        // version publiée. Interroger par référentiel renverrait les critères
        // de toutes ses versions confondues.
        var version = versionService.versionDeTravail(referentiel);
        var criteres = critereRepository.parVersion(version.getId()).stream().map(CritereDto::depuis).toList();
        return Response.ok(criteres).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed({"SUPER_ADMIN", "ADMIN_AUDIT"})
    public Response creer(ReferentielCreateRequestDto requete) {
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }
        if (referentielRepository.parCode(requete.code()).isPresent()) {
            return erreur(409, "Un référentiel avec le code '" + requete.code() + "' existe déjà");
        }

        TypeReferentiel type;
        try {
            type = TypeReferentiel.valueOf(requete.type());
        } catch (IllegalArgumentException e) {
            return erreur(400, "Type de référentiel invalide : " + requete.type()
                    + " (attendu : SMARTEX, PRI, GRESB, ITIE, IFC_SFI)");
        }

        Referentiel referentiel = new Referentiel(requete.code(), requete.nom(), type);
        referentiel.setDescription(requete.description());
        if (requete.version() != null && !requete.version().isBlank()) {
            referentiel.setVersion(requete.version());
        }
        // persistAndFlush : @CreationTimestamp n'est renseigné par Hibernate
        // qu'au flush, qui n'aurait autrement lieu qu'en fin de transaction —
        // createdAt serait alors nul dans la réponse renvoyée au client.
        referentielRepository.persistAndFlush(referentiel);

        // Un référentiel sans version serait inutilisable : rien ne pourrait
        // y être ajouté, faute de version pour accueillir le contenu.
        UUID auteurId = tenantContext.utilisateurCourantId();
        versionService.creerVersionInitiale(referentiel, utilisateurRepository.findById(auteurId));

        auditLogService.journaliser(auteurId, null,
                "REFERENTIEL_CREE", "referentiel", referentiel.getId());

        return Response.status(Response.Status.CREATED).entity(ReferentielDto.depuis(referentiel)).build();
    }

    @PUT
    @Path("/{code}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed({"SUPER_ADMIN", "ADMIN_AUDIT"})
    public Response modifier(@PathParam("code") String code, ReferentielUpdateRequestDto requete) {
        Referentiel referentiel = trouverParCode(code);
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }

        if (requete.nom() != null) {
            referentiel.setNom(requete.nom());
        }
        if (requete.description() != null) {
            referentiel.setDescription(requete.description());
        }
        if (requete.version() != null) {
            referentiel.setVersion(requete.version());
        }
        if (requete.statut() != null) {
            try {
                referentiel.setStatut(StatutGenerique.valueOf(requete.statut()));
            } catch (IllegalArgumentException e) {
                return erreur(400, "Statut invalide : " + requete.statut()
                        + " (attendu : ACTIF, INACTIF, SUSPENDU, ARCHIVE)");
            }
        }

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "REFERENTIEL_MODIFIE", "referentiel", referentiel.getId());

        return Response.ok(ReferentielDto.depuis(referentiel)).build();
    }

    /**
     * Versions d'un référentiel, de la plus récente à la plus ancienne.
     *
     * Lecture ouverte comme le reste du catalogue : savoir quand un cadre a
     * évolué intéresse l'auditeur qui l'applique, pas seulement celui qui
     * l'administre.
     */
    @GET
    @Path("/{code}/versions")
    public Response versions(@PathParam("code") String code) {
        Referentiel referentiel = trouverParCode(code);
        var versions = referentielVersionRepository.parReferentiel(referentiel.getId()).stream()
                .map(v -> ReferentielVersionDto.depuis(v, referentiel.getVersion()))
                .toList();
        return Response.ok(versions).build();
    }

    /**
     * Ouvre une version brouillon, copie conforme de la version publiée.
     *
     * C'est le seul moyen de faire évoluer un référentiel publié : la version
     * courante reste intacte, et les missions qui l'ont auditée continuent de
     * lire exactement ce qu'elles ont audité. Le brouillon ne sert aucune
     * mission tant qu'il n'est pas publié.
     */
    @POST
    @Path("/{code}/versions")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response ouvrirBrouillon(@PathParam("code") String code, @Valid PublierVersionRequestDto requete) {
        Referentiel referentiel = trouverParCode(code);
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }

        String numero = requete.numero().trim();
        if (referentielVersionRepository.numeroExiste(referentiel.getId(), numero)) {
            return erreur(409, "La version " + numero + " existe déjà pour ce référentiel");
        }

        UUID utilisateurId = tenantContext.utilisateurCourantId();
        ReferentielVersion brouillon = versionService.creerBrouillon(
                referentiel, numero, requete.notes(), utilisateurRepository.findById(utilisateurId));

        auditLogService.journaliser(utilisateurId, null, "REFERENTIEL_VERSION_BROUILLON_OUVERTE",
                "referentiel", referentiel.getId());

        return Response.status(Response.Status.CREATED)
                .entity(ReferentielVersionDto.depuis(brouillon, referentiel.getVersion()))
                .build();
    }

    /**
     * Publie un brouillon : il devient la version courante et cesse d'être
     * modifiable, en base comme par l'API. La version qu'il remplace passe en
     * archive et reste lisible pour les missions qui l'ont auditée.
     */
    @POST
    @Path("/{code}/versions/{numero}/publication")
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response publierVersion(@PathParam("code") String code, @PathParam("numero") String numero) {
        Referentiel referentiel = trouverParCode(code);
        ReferentielVersion version = referentielVersionRepository
                .parNumero(referentiel.getId(), numero)
                .orElseThrow(() -> new NotFoundException("Version inconnue : " + numero));

        UUID utilisateurId = tenantContext.utilisateurCourantId();
        versionService.publier(version, utilisateurRepository.findById(utilisateurId));

        auditLogService.journaliser(utilisateurId, null, "REFERENTIEL_VERSION_PUBLIEE",
                "referentiel", referentiel.getId());

        return Response.ok(ReferentielVersionDto.depuis(version, referentiel.getVersion())).build();
    }

    /**
     * Abandonne un brouillon et son contenu.
     *
     * Sans danger : un brouillon n'est référencé par aucune mission, seule
     * une version publiée pouvant en recevoir une. Une version publiée ou
     * archivée ne se supprime jamais (RG14) — le service refuse, et le
     * déclencheur de V49 refuserait de même.
     */
    @DELETE
    @Path("/{code}/versions/{numero}")
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response supprimerBrouillon(@PathParam("code") String code, @PathParam("numero") String numero) {
        Referentiel referentiel = trouverParCode(code);
        ReferentielVersion version = referentielVersionRepository
                .parNumero(referentiel.getId(), numero)
                .orElseThrow(() -> new NotFoundException("Version inconnue : " + numero));

        versionService.supprimerBrouillon(version);

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "REFERENTIEL_VERSION_BROUILLON_SUPPRIMEE", "referentiel", referentiel.getId());

        return Response.noContent().build();
    }

    private Referentiel trouverParCode(String code) {
        return referentielRepository.parCode(code)
                .orElseThrow(() -> new NotFoundException("Référentiel inconnu : " + code));
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
