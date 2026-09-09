package com.smartexsustway.api.domain.enums;

/**
 * Nature de l'élément qu'une exigence appelle en démonstration.
 * Correspond au type PostgreSQL {@code type_preuve_attendue} (V51).
 *
 * À ne pas confondre avec {@link TypePreuve}, qui qualifie une pièce
 * réellement déposée par une organisation pendant une mission. Ici, il
 * s'agit de ce que l'audit attend, avant même qu'une pièce n'existe.
 */
public enum TypePreuveAttendue {
    POLITIQUE,
    PROCEDURE,
    REGISTRE,
    RAPPORT,
    CERTIFICAT,
    INDICATEUR,
    DOCUMENT_LEGAL,
    PREUVE_OPERATIONNELLE,
    AUTRE
}
