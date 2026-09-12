package com.smartexsustway.api.domain.enums;

/** Correspond au type PostgreSQL {@code origine_axe}.
 *
 * <p>Distinct de {@link OrigineContenu}, dont les valeurs désignent la
 * provenance du contenu d'un référentiel — un axe de mission ne vient
 * d'aucun import. */
public enum OrigineAxe {
    IA,
    HUMAIN
}
