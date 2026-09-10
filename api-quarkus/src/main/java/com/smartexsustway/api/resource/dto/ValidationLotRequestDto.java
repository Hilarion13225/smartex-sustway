package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.referentiel.ValidationLotService;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

/**
 * Corps d'une validation en lot.
 *
 * Les éléments sont désignés explicitement, un par un, plutôt que par un
 * « tout valider » implicite : l'écran doit répondre de ce qu'il a coché, et
 * un filtre côté serveur pourrait retenir autre chose que ce que la personne
 * avait sous les yeux au moment du clic.
 *
 * La version, elle, vient du chemin : le lot est monté sur l'import, et c'est
 * lui qui borne le périmètre. Un identifiant appartenant à un autre
 * référentiel fait échouer l'ensemble plutôt que d'être appliqué ailleurs.
 */
public record ValidationLotRequestDto(
        @NotEmpty(message = "Le lot doit désigner au moins un élément")
        List<ElementDto> elements
) {

    /**
     * @param nature EXIGENCE, PREUVE_ATTENDUE ou REGLE_ANALYSE — les trois
     *               natures que l'import produit et que la relecture tranche
     */
    public record ElementDto(String nature, UUID id) {
    }

    public List<ValidationLotService.ElementVise> versElements() {
        return elements == null
                ? List.of()
                : elements.stream()
                        .map(e -> new ValidationLotService.ElementVise(e.nature(), e.id()))
                        .toList();
    }
}
