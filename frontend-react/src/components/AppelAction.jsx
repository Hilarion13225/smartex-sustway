import { Link } from 'react-router-dom';
import { typoFr } from '../lib/typographie';

/**
 * Bandeau d'appel final des pages vitrine : une plage encre pleine largeur,
 * un titre, une phrase, deux actions.
 *
 * La plage est toujours sombre, par choix : sa couleur est donc écrite en dur
 * plutôt que prise au jeton `ink-900`, qui s'éclaircit en thème sombre.
 *
 * L'action par défaut est la même partout — choisir une formule — : c'est
 * l'étape qui mène à l'achat. La démonstration reste offerte en second, pour
 * qui veut d'abord parler à quelqu'un. Le libellé dit ce qui se passe au
 * clic — sans flèche, qui n'ajoutait rien au verbe.
 */
export default function AppelAction({
  titre = 'Prêt à évaluer votre démarche RSE, ESG et DD ?',
  texte = 'Choisissez votre formule et commencez aujourd’hui. Accès à la plateforme dès le paiement validé.',
  action = { libelle: 'Voir les offres', vers: '/offres' },
  secondaire = { libelle: 'Demander une démonstration', vers: '/contact' },
  // Bord oblique : éteint par défaut, parce que ce bandeau ferme sept pages et
  // qu'une pente sur toutes ferait du procédé un tic plutôt qu'un accent.
  diagonale = false,
}) {
  return (
    <section className={`bg-[#14234B] text-white${diagonale ? ' bord-diagonal' : ''}`}>
      <div className="mx-auto grid max-w-[90rem] gap-8 px-5 py-16 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
        <div className="max-w-2xl">
          <h2 className="titre-section text-white">
            {typoFr(titre)}
          </h2>
          {texte ? <p className="mt-4 texte-chapo text-white/75">{typoFr(texte)}</p> : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to={action.vers}
            viewTransition
            className="inline-flex min-h-12 items-center justify-center btn-presse rounded-[4px] bg-white px-6 text-base font-semibold text-[#14234B] transition-colors hover:bg-[#E8EAF2]"
          >
            {action.libelle}
          </Link>
          {secondaire ? (
            <Link
              to={secondaire.vers}
              viewTransition
              className="inline-flex min-h-12 items-center justify-center btn-presse rounded-[4px] border border-white/35 px-6 text-base font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
            >
              {secondaire.libelle}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
