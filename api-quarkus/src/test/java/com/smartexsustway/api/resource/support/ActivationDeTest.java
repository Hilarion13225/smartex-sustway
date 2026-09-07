package com.smartexsustway.api.resource.support;

import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.UUID;

/**
 * Active un compte de test sans passer par le code à usage unique.
 *
 * Depuis le passage à l'OTP (V28), le code n'est plus déductible : seule son
 * empreinte est stockée. Un test ne peut donc pas le rejouer comme il rejouait
 * autrefois le lien signé. Il active donc le compte directement, ce qui laisse
 * RG36 pleinement appliquée sur l'API — les tests qui vérifient le refus de
 * connexion avant activation restent valables.
 */
@ApplicationScoped
public class ActivationDeTest {

    @Inject
    UtilisateurRepository utilisateurRepository;

    @Transactional
    public void activer(String utilisateurId) {
        Utilisateur utilisateur = utilisateurRepository.findById(UUID.fromString(utilisateurId));
        if (utilisateur != null) {
            utilisateur.marquerEmailVerifie();
        }
    }
}
