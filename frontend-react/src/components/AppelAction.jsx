import { Link } from 'react-router-dom';
import { typoFr } from '../lib/typographie';
import Revele from './Revele';

/**
 * Bandeau d'appel final des pages vitrine : une plage claire pleine largeur,
 * un titre, une phrase, deux actions.
 *
 * L'action par défaut est la même partout — choisir une formule — : c'est
 * l'étape qui mène à l'achat. La démonstration reste offerte en second, pour
 * qui veut d'abord parler à quelqu'un. Le libellé dit ce qui se passe au
 * clic — sans flèche, qui n'ajoutait rien au verbe.
 */
export default function AppelAction({
  titre = 'Prêt à évaluer votre démarche RSE ?',
  texte = 'Choisissez votre formule et commencez aujourd’hui. Accès à la plateforme dès le paiement validé.',
  action = { libelle: 'Choisir une formule', vers: '/formules#grille-formules' },
  secondaire = { libelle: 'Demander une démonstration', vers: '/contact' },
}) {
  return (
    <section className="bande-brand border-t border-ink-200">
      <Revele className="mx-auto grid max-w-[75rem] gap-8 px-5 py-16 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-[1.875rem] font-bold leading-[1.08] tracking-[-0.025em] text-ink-900 [text-wrap:balance] sm:text-[2.5rem]">
            {typoFr(titre)}
          </h2>
          {texte ? <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-ink-600">{typoFr(texte)}</p> : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to={action.vers}
            viewTransition
            className="btn-presse inline-flex min-h-12 items-center justify-center rounded-[4px] bg-brand-600 px-6 text-base font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {action.libelle}
          </Link>
          {secondaire ? (
            <Link
              to={secondaire.vers}
              viewTransition
              className="btn-presse inline-flex min-h-12 items-center justify-center rounded-[4px] border border-ink-300 px-6 text-base font-semibold text-ink-900 transition-colors hover:border-ink-900"
            >
              {secondaire.libelle}
            </Link>
          ) : null}
        </div>
      </Revele>
    </section>
  );
}
