package com.smartexsustway.api.abonnement;

import com.smartexsustway.api.domain.entity.Abonnement;
import com.smartexsustway.api.domain.entity.Paiement;
import com.smartexsustway.api.domain.enums.FournisseurPaiement;
import com.smartexsustway.api.domain.repository.PaiementRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Traitement des paiements d'abonnement (formules Standard/Avancées).
 *
 * ⚠️ STUB — décision actée CDC §13 : PI-SPI et Wave sont les fournisseurs
 * retenus, mais le CDC lui-même (§5.3, "point ouvert restant") indique que
 * "les modalités précises d'intégration technique avec PI-SPI et Wave (API,
 * frais, couverture des opérateurs) restent à cadrer avec Smartex
 * Expertises". Sans ce cadrage (identifiants API, format des requêtes,
 * mécanisme de webhook/callback), une intégration réelle serait au mieux
 * un code mort non testable, au pire une fausse impression de paiement
 * fonctionnel.
 *
 * Ce service enregistre donc le paiement et le marque immédiatement REUSSI
 * (mode développement), pour permettre de développer et tester tout le
 * reste du flux (activation d'abonnement, RG20, etc.) sans dépendre de
 * l'intégration réelle. Le point d'entrée (traiter()) est conçu pour être
 * remplacé par un vrai appel API sans changer son contrat — le reste de
 * l'application (AbonnementResource) n'a pas à changer quand ce sera fait.
 *
 * TODO intégration réelle (bloqué sur cadrage Smartex Expertises) :
 *   - PI-SPI : identifiants marchand, format de requête, callback de confirmation
 *   - Wave : identifiants marchand, format de requête, callback de confirmation
 *   - Vérification de signature des callbacks (sécurité : ne jamais activer
 *     un abonnement sur la seule foi d'un appel du frontend)
 */
@ApplicationScoped
public class PaiementService {

    @Inject
    PaiementRepository paiementRepository;

    public Paiement initierEtTraiter(Abonnement abonnement, FournisseurPaiement fournisseur) {
        BigDecimal montant = abonnement.getFormule().getPrix();

        String reference = "DEV-" + fournisseur.name() + "-" + UUID.randomUUID();
        Paiement paiement = new Paiement(abonnement, fournisseur, reference, montant);
        paiementRepository.persist(paiement);

        // --- Simulation du traitement (mode dev, cf. javadoc de la classe) ---
        paiement.setStatut(com.smartexsustway.api.domain.enums.StatutPaiement.REUSSI);
        paiement.setDatePaiement(OffsetDateTime.now());
        abonnement.activerSuitePaiement();

        return paiement;
    }
}
