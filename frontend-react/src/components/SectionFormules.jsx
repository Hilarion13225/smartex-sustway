import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Lock, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterMontant } from '../lib/export';
import { Badge, Loader } from './ui';
import Revele from './Revele';

// Nombre de cartes -> colonnes et largeur max de la grille, pour qu'elle
// reste centrée et les cartes correctement proportionnées quel que soit le
// nombre de formules actives (ex. Free retirée : 2 formules restantes,
// sinon coincées à gauche d'une 3e colonne vide en lg:grid-cols-3 fixe).
const GRILLE_PAR_NOMBRE = {
  1: 'lg:grid-cols-1 max-w-md',
  2: 'lg:grid-cols-2 max-w-4xl',
};
const GRILLE_PAR_DEFAUT = 'lg:grid-cols-3';

/**
 * Éclate la description d'une formule en points de liste. Les virgules entre
 * parenthèses sont ignorées : « Pipeline IA complet (+ Risk, Recommendation),
 * revue experte » donne deux points et non trois. Une description sans
 * virgule reste simplement un point unique.
 */
function pointsDescription(description) {
  if (!description) return [];
  const points = [];
  let courant = '';
  let profondeur = 0;
  for (const caractere of description) {
    if (caractere === '(') profondeur += 1;
    else if (caractere === ')') profondeur = Math.max(0, profondeur - 1);

    if (caractere === ',' && profondeur === 0) {
      points.push(courant.trim());
      courant = '';
    } else {
      courant += caractere;
    }
  }
  points.push(courant.trim());
  return points.filter(Boolean);
}

/**
 * Grille des formules, alimentée par l'endpoint public existant
 * (`listerFormules`). Utilisée par la page d'accueil et par la page Formules.
 *
 * `niveauTitre` : `h2` par défaut, la section venant alors après le titre de
 * la page. La page Formules, qui n'a pas d'autre en-tête, passe `h1` — sans
 * quoi elle se retrouverait sans titre principal.
 */
export default function SectionFormules({ titre, description, id = 'formules', niveauTitre: Titre = 'h2' }) {
  const navigate = useNavigate();
  const { listerFormules } = useApiAuth();
  const [formules, setFormules] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let actif = true;
    listerFormules()
      .then((liste) => {
        if (actif) setFormules(Array.isArray(liste) ? liste : []);
      })
      .catch(() => {
        if (actif) setFormules([]);
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, [listerFormules]);

  return (
    <section id={id} className="relative mx-auto max-w-[90rem] scroll-mt-24 px-5 py-20">
      <Revele className="max-w-3xl">
        <p className="sur-titre text-brand-600 dark:text-brand-400">
          <span className="filet" aria-hidden />
          <Sparkles className="h-4 w-4" aria-hidden />
          Tarification
        </p>
        <Titre className="titre-editorial mt-5 text-3xl leading-tight text-ink-900 sm:text-[2.6rem]">{titre}</Titre>
        <p className="mt-4 text-base font-light leading-relaxed text-ink-600">{description}</p>
      </Revele>

      {chargement ? (
        <Loader message="Chargement des formules…" />
      ) : (
        <div className={clsx('mx-auto mt-10 grid gap-6', GRILLE_PAR_NOMBRE[formules.length] ?? GRILLE_PAR_DEFAUT)}>
          {formules.map((formule, index) => {
            const misEnAvant = formule.code === 'AVANCEES';
            const gratuit = Number(formule.prix) === 0;
            return (
              <Revele key={formule.code} delai={index * 110}>
                <article
                  className={clsx(
                    'carte-vitrine flex h-full flex-col',
                    misEnAvant && 'border-brand-300 ring-2 ring-brand-500/70'
                  )}
                >
                  {misEnAvant ? (
                    <span
                      className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-500/15 blur-2xl motion-safe:animate-respiration"
                      aria-hidden
                    />
                  ) : null}
                  <div className="relative flex items-center justify-between gap-3">
                    <h3 className="titre-editorial text-xl text-ink-900">{formule.nom}</h3>
                    {misEnAvant ? <Badge ton="vert">Recommandée</Badge> : null}
                  </div>

                  {/* Le prix passe avant le détail : c'est l'information que
                      l'on cherche en premier sur une grille tarifaire. */}
                  <p className="relative mt-6 flex items-baseline gap-1.5 text-4xl font-semibold text-ink-900">
                    {gratuit ? 'Gratuit' : formaterMontant(formule.prix)}
                    {gratuit ? null : <span className="text-sm font-medium text-ink-500">/ an</span>}
                  </p>
                  <p className="relative mt-1 text-xs text-ink-500">
                    {gratuit ? 'Consultation en mode démonstration uniquement' : 'Licence annuelle, renouvelable'}
                  </p>

                  {/* Description éclatée en points : le même texte, mais
                      comparable d'une formule à l'autre d'un coup d'oeil. */}
                  <ul className="relative mt-7 space-y-3 border-t border-ink-100 pt-7">
                    {pointsDescription(formule.description).map((point) => (
                      <li key={point} className="flex gap-3 text-sm leading-relaxed text-ink-600">
                        <Check
                          className={clsx(
                            'mt-0.5 h-4 w-4 shrink-0',
                            misEnAvant ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400'
                          )}
                          aria-hidden
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex-1" />
                  <button
                    type="button"
                    className={clsx('relative mt-7 w-full group', misEnAvant ? 'btn-vitrine' : 'btn-vitrine-clair')}
                    onClick={() => navigate(`/inscription?formule=${formule.code}`)}
                  >
                    Choisir {formule.nom}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                  </button>
                </article>
              </Revele>
            );
          })}
        </div>
      )}

      {/* Centrée comme la grille : alignée à gauche, la mention flottait
          seule à l'opposé des cartes sur un large écran. */}
      <p className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-500">
        <Lock className="h-3.5 w-3.5" aria-hidden />
        Paiement des formules Standard et Avancées via PI-SPI et Wave.
      </p>
    </section>
  );
}
