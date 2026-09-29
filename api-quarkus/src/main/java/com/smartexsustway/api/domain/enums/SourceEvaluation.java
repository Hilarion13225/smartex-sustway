package com.smartexsustway.api.domain.enums;

/** Correspond au type PostgreSQL {@code source_evaluation}. */
public enum SourceEvaluation {
    /** Le pipeline d'agents a instruit le critere. */
    IA,
    /** Une personne a instruit ou rectifie le critere. */
    EXPERT,
    /**
     * Constat d'absence : le critere ne portait ni declaration, ni preuve, ni
     * scenario. Aucun modele n'a travaille — la note decoule de l'absence
     * d'element, et de rien d'autre. Source distincte pour que l'audit ne
     * confonde jamais une regle de gestion avec un jugement d'agent.
     */
    SYSTEME
}
