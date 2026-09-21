import Bouton from './Bouton';
import { Apparition } from './Section';
import { ApercuTableauDeBord } from './ApercusFonctionnalites';

/*
 * Appel à l'action de fin de page.
 *
 * L'aperçu produit est ici volontairement en retrait : réduit, décalé hors du
 * cadre et légèrement voilé. C'est la dernière chose que voit un visiteur
 * avant le pied de page, et la charte est explicite — le tableau de bord ne
 * doit pas prendre la priorité sur l'action. Il sert de rappel de ce dont on
 * parle, pas de démonstration ; celle-ci a eu lieu plus haut.
 *
 * Il est monté seulement à partir de 1024 px : sous cette largeur, il passerait
 * sous le texte et deviendrait un troisième bloc à faire défiler juste avant
 * le pied de page.
 */
export default function SectionCtaFinal() {
  return (
    <section className="relative overflow-hidden bg-forest">
      {/* Halo clair en haut à droite : il détache le bloc du vert plat et
          amène l'œil vers l'aperçu, sans introduire de seconde couleur. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_0%,rgba(139,201,165,0.16),transparent_70%)]"
      />

      <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:py-24">
        <Apparition>
          <h2 className="max-w-2xl text-[30px] font-semibold leading-[1.15] tracking-[-0.02em] text-white sm:text-[38px]">
            Donnez une trajectoire mesurable à votre démarche durable.
          </h2>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/75 sm:text-lg">
            Avec SMARTEX SustWay, transformez vos données RSE et ESG en décisions, actions et progrès mesurables.
          </p>
          <div className="mt-9">
            <Bouton
              vers="/contact"
              niveau="principal-sombre"
              taille="lg"
              className="w-full focus-visible:ring-white focus-visible:ring-offset-forest sm:w-auto"
            >
              Demander une démo
            </Bouton>
          </div>
        </Apparition>

        <Apparition delai={140} className="hidden lg:block">
          {/* `-mr-16` fait sortir l'aperçu du cadre : arrêté net sur la marge,
              il redeviendrait un bloc à part entière et reprendrait le poids
              qu'on cherche à lui retirer. */}
          <div aria-hidden className="pointer-events-none -mr-16 select-none opacity-[0.88]">
            <ApercuTableauDeBord />
          </div>
        </Apparition>
      </div>
    </section>
  );
}
