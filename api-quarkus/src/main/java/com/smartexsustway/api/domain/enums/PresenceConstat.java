package com.smartexsustway.api.domain.enums;

/** Correspond au type PostgreSQL {@code presence_constat}.
 *
 * <p>{@code NON_VERIFIABLE} n'est pas un degré d'absence : c'est une absence
 * de constat — document illisible, hors périmètre, format non exploitable.
 * Le confondre avec {@code ABSENT} ferait porter à l'organisation le coût
 * d'un défaut technique de lecture. */
public enum PresenceConstat {
    PRESENT,
    PARTIEL,
    ABSENT,
    NON_VERIFIABLE
}
