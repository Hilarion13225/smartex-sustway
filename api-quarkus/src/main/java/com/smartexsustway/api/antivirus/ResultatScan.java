package com.smartexsustway.api.antivirus;

import com.smartexsustway.api.domain.enums.StatutScanDocument;

/** Résultat d'un scan ClamAV, transposable directement en {@link StatutScanDocument}. */
public record ResultatScan(StatutScanDocument statut, String detail) {

    public static ResultatScan sain() {
        return new ResultatScan(StatutScanDocument.SAIN, null);
    }

    public static ResultatScan infecte(String signature) {
        return new ResultatScan(StatutScanDocument.INFECTE, signature);
    }

    public static ResultatScan erreur(String detail) {
        return new ResultatScan(StatutScanDocument.ERREUR, detail);
    }
}
