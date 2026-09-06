package com.smartexsustway.api.security;

import com.smartexsustway.api.domain.entity.CodeVerificationEmail;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.repository.CodeVerificationEmailRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * Émission et vérification des codes d'activation de compte (RG36).
 *
 * Le code fait six chiffres, ce qui suppose de compenser sa faible entropie :
 * durée de vie courte, essais comptés, et un seul code vivant à la fois.
 */
@ApplicationScoped
public class CodeVerificationService {

    /** Durée de validité d'un code, à refléter dans l'email et l'interface. */
    public static final Duration DUREE_VALIDITE = Duration.ofMinutes(3);

    /** Essais autorisés sur un même code avant de le rendre inutilisable. */
    public static final int TENTATIVES_MAX = 5;

    private static final SecureRandom ALEA = new SecureRandom();

    @Inject CodeVerificationEmailRepository codeRepository;
    @Inject PasswordService passwordService;

    /** Issue d'une vérification — distinguée pour que l'appelant informe justement. */
    public enum Resultat {
        VALIDE,
        CODE_INCORRECT,
        CODE_EXPIRE,
        TROP_DE_TENTATIVES,
        AUCUN_CODE
    }

    /**
     * Émet un code pour ce compte et renvoie sa valeur en clair — la seule
     * occasion de la connaître, puisque seule l'empreinte est conservée.
     * L'appelant l'envoie par email et ne doit ni la journaliser ni la
     * retourner dans une réponse HTTP.
     */
    public String emettre(Utilisateur utilisateur) {
        codeRepository.consommerCodesVivants(utilisateur.getId());

        // nextInt(1_000_000) puis formatage sur six chiffres : tirer chaque
        // chiffre séparément donnerait la même distribution, en plus verbeux.
        String code = String.format("%06d", ALEA.nextInt(1_000_000));
        var entree = new CodeVerificationEmail(
                utilisateur,
                passwordService.hacher(code),
                OffsetDateTime.now().plus(DUREE_VALIDITE));
        codeRepository.persist(entree);
        return code;
    }

    /**
     * Vérifie un code saisi. Un code correct est consommé immédiatement ; un
     * code erroné incrémente le compteur d'essais du code en cours, sans
     * jamais révéler lequel des deux — code ou compte — est en cause.
     */
    public Resultat verifier(Utilisateur utilisateur, String codeSaisi) {
        Optional<CodeVerificationEmail> dernier = codeRepository.dernierPourUtilisateur(utilisateur.getId());
        if (dernier.isEmpty()) {
            return Resultat.AUCUN_CODE;
        }

        CodeVerificationEmail code = dernier.get();
        if (code.getConsommeLe() != null) {
            return Resultat.AUCUN_CODE;
        }
        if (code.getTentatives() >= TENTATIVES_MAX) {
            return Resultat.TROP_DE_TENTATIVES;
        }
        if (code.getExpireLe().isBefore(OffsetDateTime.now())) {
            return Resultat.CODE_EXPIRE;
        }

        if (!passwordService.verifier(codeSaisi, code.getCodeHash())) {
            code.incrementerTentatives();
            return code.getTentatives() >= TENTATIVES_MAX
                    ? Resultat.TROP_DE_TENTATIVES
                    : Resultat.CODE_INCORRECT;
        }

        code.consommer();
        return Resultat.VALIDE;
    }
}
