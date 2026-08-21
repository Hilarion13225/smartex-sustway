package com.smartexsustway.api.rapport;

/** Erreur inattendue lors de la génération du contenu d'un rapport (PDF/CSV). */
public class RapportGenerationException extends RuntimeException {

    public RapportGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
