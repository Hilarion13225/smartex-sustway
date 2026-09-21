import { Database, ListChecks, RefreshCw, Target, TrendingUp } from 'lucide-react';
import Bouton from './Bouton';
import { Apparition } from './Section';
import { useApparition } from './useApparition';

/*
 * La trajectoire que la plateforme fait suivre, en cinq maillons.
 *
 * Elle remplace l'aperçu du tableau de bord qui tenait cette place. Un
 * septième écran du produit, posé juste avant le pied de page, redisait ce que
 * la page « Fonctionnalités » montre en grand ; la chaîne, elle, dit une chose
 * que rien d'autre ne dit sur le site — dans quel ordre les choses se
 * produisent, et qu'elles rebouclent.
 *
 * Le dernier maillon porte une flèche circulaire et non une flèche droite :
 * l'amélioration continue n'est pas l'étape qui vient après la performance,
 * c'est celle qui renvoie aux données. C'est la seule différence de dessin
 * entre les cinq, et elle porte tout le propos.
 */
const CHAINE = [
  { libelle: 'Données', icone: Database },
  { libelle: 'Objectifs', icone: Target },
  { libelle: 'Actions', icone: ListChecks },
  { libelle: 'Performance', icone: TrendingUp },
  { libelle: 'Amélioration continue', icone: RefreshCw, boucle: true },
];

function ChaineDeValeur() {
  const { reference, visible } = useApparition({ seuil: 0.25 });

  return (
    <div ref={reference}>
      <ol className="space-y-1">
        {CHAINE.map((maillon, index) => {
        const Icone = maillon.icone;
          return (
            <li key={maillon.libelle}>
              <div
                style={visible ? { transitionDelay: `${index * 90}ms` } : undefined}
                className={`flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3.5 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
                  visible
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-3 opacity-0 motion-reduce:translate-x-0 motion-reduce:opacity-100'
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-growth/20 text-growth">
                  <Icone className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="text-[15px] font-semibold text-white">{maillon.libelle}</span>
              </div>

              {/* Le trait de liaison appartient au maillon qui précède, et le
                  dernier n'en porte donc pas : il n'y a rien après lui, il
                  revient au premier. */}
              {maillon.boucle ? null : (
                <span aria-hidden className="ml-[34px] flex h-4 w-px bg-white/25" />
              )}
            </li>
          );
        })}
      </ol>

      {/* Ce que la flèche circulaire du dernier maillon dit en dessin, écrit
          en toutes lettres : hors de la liste, puisque ce n'est pas une
          sixième étape. */}
      <p className="mt-4 flex items-center gap-2 pl-1 text-[13px] text-white/55">
        <RefreshCw className="h-3.5 w-3.5 shrink-0 text-growth/70" strokeWidth={2} aria-hidden />
        et l’on recommence, sur des bases mesurées.
      </p>
    </div>
  );
}

/*
 * Appel à l'action de fin de page.
 *
 * Il ferme les quatre pages intérieures. Pas l'accueil : le héros y propose
 * déjà la démonstration deux écrans plus haut.
 */
export default function SectionCtaFinal() {
  return (
    <section className="relative overflow-hidden bg-forest">
      {/* Halo clair en haut à droite : il détache le bloc du vert plat et
          amène l'œil vers la chaîne, sans introduire de seconde couleur. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_0%,rgba(139,201,165,0.16),transparent_70%)]"
      />

      <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-16 lg:py-24">
        <Apparition>
          <h2 className="max-w-2xl text-[30px] font-semibold leading-[1.15] tracking-[-0.02em] text-white sm:text-[38px]">
            Donnez un temps d’avance à votre démarche RSE.
          </h2>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/75 sm:text-lg">
            Avec SMARTEX SustWay, structurez, pilotez et optimisez votre performance globale dès aujourd’hui.
          </p>
          <div className="mt-9">
            <Bouton
              vers="/contact"
              niveau="principal-sombre"
              taille="lg"
              className="w-full focus-visible:ring-white focus-visible:ring-offset-forest sm:w-auto"
            >
              Demander une démonstration
            </Bouton>
          </div>
        </Apparition>

        {/*
         * La chaîne reste visible sur téléphone, contrairement à l'aperçu
         * qu'elle remplace : cinq lignes courtes ne sont pas un écran de
         * logiciel illisible à 390 px, et elles portent du texte.
         */}
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-growth">La trajectoire</p>
          <div className="mt-5">
            <ChaineDeValeur />
          </div>
        </div>
      </div>
    </section>
  );
}
