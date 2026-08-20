package com.smartexsustway.api.stockage;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * Stockage documentaire (RG15) sur S3/MinIO. Le bucket est créé au
 * démarrage s'il n'existe pas déjà (MinIO ne pré-crée aucun bucket, à
 * l'inverse d'AWS S3 où on suppose généralement un bucket déjà provisionné
 * par ailleurs) — évite une étape manuelle de configuration en dev.
 */
@ApplicationScoped
public class StorageService {

    private static final Logger LOG = Logger.getLogger(StorageService.class);

    @Inject
    S3Client s3Client;

    @ConfigProperty(name = "smartex.storage.bucket")
    String bucket;

    void demarrage(@Observes StartupEvent evenement) {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                LOG.infof("Bucket '%s' absent, création...", bucket);
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
            } else {
                // On ne bloque jamais le démarrage de l'application pour un
                // souci de stockage documentaire (dégradation identique à
                // EmailService) : les uploads échoueront proprement le
                // moment venu, mais le reste de l'API reste utilisable.
                LOG.warnf(e, "Impossible de vérifier/créer le bucket '%s' au démarrage", bucket);
            }
        }
    }

    public void televerser(String cle, byte[] contenu, String typeMime) {
        s3Client.putObject(
                PutObjectRequest.builder().bucket(bucket).key(cle).contentType(typeMime).build(),
                RequestBody.fromBytes(contenu)
        );
    }

    public byte[] telecharger(String cle) {
        try (ResponseInputStream<GetObjectResponse> flux =
                     s3Client.getObject(GetObjectRequest.builder().bucket(bucket).key(cle).build())) {
            return flux.readAllBytes();
        } catch (java.io.IOException e) {
            throw new StorageException("Échec de lecture du document depuis le stockage", e);
        }
    }

    public void supprimer(String cle) {
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(cle).build());
    }
}
