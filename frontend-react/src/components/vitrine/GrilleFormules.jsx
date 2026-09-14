import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import clsx from 'clsx';
import { useApiAuth } from '../../auth/useApiAuth';
import { formaterMontant } from '../../lib/export';
import {
  ACCROCHES,
  FORMULE_ENTREPRISE,
  HERITAGE,
  METHODOLOGIE_INCLUSE,
  POINTS_CLAIRS,
  SOUS_TITRES,
  pointsDescription,
} from '../../lib/formules';
import { Alerte, Loader } from '../ui';
import Revele from '../Revele';

/**
 * La grille des formules, telle qu'elle s'affiche sur la page Formules.
 *
 * Partagée avec la page Solution pour que les deux montrent exactement les
 * mêmes cartes — même contenu, même mise en forme, mêmes boutons — et ne
 * divergent jamais : toute retouche d'une carte se fait ici.
 *
 * `niveauTitre` règle la balise du nom de formule : `h2` quand la grille est
 * le contenu principal de la page, `h3` sous une section déjà titrée.
 */
export default function GrilleFormules({ niveauTitre: Titre = 'h2' }) {
  const navigate = useNavigate();
  const { listerFormules } = useApiAuth();
  const [formules, setFormules] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [catalogueIndisponible, setCatalogueIndisponible] = useState(false);

  useEffect(() => {
    let actif = true;
    listerFormules()
      .then((liste) => {
        if (!actif) return;
        const recues = Array.isArray(liste) ? liste : [];
        setFormules(recues);
        // Une liste vide est traitée comme une indisponibilité : afficher la
        // seule offre sur devis reviendrait à présenter un catalogue amputé
        // comme s'il était complet.
        setCatalogueIndisponible(recues.length === 0);
      })
      .catch(() => {
        if (!actif) return;
        setFormules([]);
        setCatalogueIndisponible(true);
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, [listerFormules]);

  // Les formules actives viennent de l'API ; l'offre sur devis les complète.
  // La description stockée décrit la chaîne d'analyse ; la démarche incluse la
  // complète. Les deux listes restent distinctes à la construction pour que la
  // carte puisse les séparer d'un filet.
  const cartes = [
    ...formules.map((formule) => ({
      code: formule.code,
      nom: formule.nom,
      sousTitre: SOUS_TITRES[formule.code] ?? '',
      prix: formule.prix,
      // La description stockée est écrite pour l'équipe technique : la carte
      // affiche sa version en français courant, et retombe sur elle si le code
      // n'est pas encore listé.
      points: POINTS_CLAIRS[formule.code] ?? pointsDescription(formule.description),
      demarche: METHODOLOGIE_INCLUSE[formule.code] ?? [],
    })),
    { ...FORMULE_ENTREPRISE, demarche: [] },
  ];
  const colonnes = cartes.length >= 4 ? 'lg:grid-cols-2 xl:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <>
    {chargement ? (
      <Loader message="Chargement des formules…" />
    ) : (
      <>
        {/* Le message du client d'API vise le développeur (« lancez
            quarkus:dev ») : le visiteur reçoit ici une phrase qui lui dit
            quoi faire, et l'offre sur devis reste affichée puisqu'elle ne
            dépend pas du serveur. */}
        {catalogueIndisponible ? (
          <div className="mb-6">
            <Alerte ton="rouge">
              Nos formules Standard et Avancées ne peuvent pas être affichées pour le moment.{' '}
              <Link to="/contact" className="font-semibold underline">
                Contactez-nous
              </Link>{' '}
              et nous vous transmettons la grille tarifaire.
            </Alerte>
          </div>
        ) : null}

        <div className={clsx('grid gap-6', colonnes)}>
        {cartes.map((carte, index) => {
          const misEnAvant = carte.code === 'AVANCEES';
          const surDevis = carte.code === 'ENTREPRISE';
          const gratuit = !surDevis && Number(carte.prix) === 0;

          return (
            <Revele key={carte.code} delai={index * 100}>
              <article
                className={clsx(
                  'relative flex h-full flex-col rounded-2xl border bg-surface p-6',
                  misEnAvant
                    ? 'border-brand-400 bg-brand-50/40 shadow-soft ring-1 ring-brand-300 dark:bg-brand-500/[0.07]'
                    : 'border-ink-200'
                )}
              >
                {misEnAvant ? (
                  <span className="absolute -top-3 left-6 whitespace-nowrap rounded-[4px] bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
                    Le plus populaire
                  </span>
                ) : null}

                <Titre className="font-display text-lg font-extrabold text-marine">{carte.nom}</Titre>
                <p className="mt-1 text-[13px] text-ink-500">{carte.sousTitre}</p>

                <p className="mt-6 flex items-baseline gap-2">
                  {surDevis ? (
                    <span className="font-display text-[1.9rem] font-extrabold leading-none text-marine">
                      {carte.mentionPrix}
                    </span>
                  ) : (
                    <>
                      {/* Chiffres tabulaires : les trois prix s'alignent
                          verticalement d'une carte à l'autre. */}
                      <span className="font-chiffres text-[1.9rem] font-extrabold leading-none text-marine [font-variant-numeric:tabular-nums]">
                        {gratuit ? 'Gratuit' : formaterMontant(carte.prix)}
                      </span>
                      {gratuit ? null : <span className="text-xs font-medium text-ink-500">/ an</span>}
                    </>
                  )}
                </p>
                <p className="mt-1.5 text-[13px] leading-snug text-ink-500">
                  {surDevis
                    ? 'Périmètre et accompagnement définis avec vous'
                    : gratuit
                      ? 'Consultation en mode démonstration uniquement'
                      : 'Licence annuelle, renouvelable'}
                </p>

                {ACCROCHES[carte.code] ? (
                  <p className="mt-5 text-[13px] font-medium leading-snug text-marine">{ACCROCHES[carte.code]}</p>
                ) : null}

                {HERITAGE[carte.code] ? (
                  <p className="mt-5 border-t border-ink-100 pt-5 text-[13px] font-semibold text-ink-500">
                    {HERITAGE[carte.code]}
                  </p>
                ) : null}

                <ul
                  className={clsx(
                    'space-y-3',
                    HERITAGE[carte.code] ? 'mt-4' : 'mt-5 border-t border-ink-100 pt-5'
                  )}
                >
                  {carte.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-sm leading-snug text-ink-600">
                      <Check
                        className={clsx(
                          'mt-0.5 h-4 w-4 shrink-0',
                          misEnAvant ? 'text-brand-600 dark:text-brand-400' : 'text-feuille'
                        )}
                        aria-hidden
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                {carte.demarche.length ? (
                  <ul className="mt-3 space-y-3 border-t border-ink-100 pt-4">
                    {carte.demarche.map((point) => (
                      <li key={point} className="flex gap-2.5 text-sm leading-snug text-ink-600">
                        <Check
                          className={clsx(
                            'mt-0.5 h-4 w-4 shrink-0',
                            misEnAvant
                              ? 'text-brand-600 dark:text-brand-400'
                              : 'text-feuille'
                          )}
                          aria-hidden
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex-1" />

                {surDevis ? (
                  <Link
                    to="/contact"
                    className="mt-7 inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-ink-300 px-5 py-3 text-sm font-semibold text-ink-900 transition duration-300 hover:border-ink-900"
                  >
                    Nous contacter
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/inscription?formule=${carte.code}`)}
                    className={clsx(
                      'group mt-7 inline-flex w-full items-center justify-center gap-2.5 rounded-lg px-5 py-3 text-sm font-semibold transition duration-300',
                      misEnAvant
                        ? 'bg-brand-600 text-white hover:bg-brand-700'
                        : 'border border-ink-300 text-ink-900 hover:border-ink-900'
                    )}
                  >
                    Choisir cette formule
                  </button>
                )}
              </article>
            </Revele>
          );
        })}
        </div>
      </>
    )}

    <p className="mt-8 flex items-center gap-2 text-sm text-ink-500">
      <Lock className="h-3.5 w-3.5" aria-hidden />
      Paiement des formules Standard et Avancées via PI-SPI et Wave.
    </p>
    </>
  );
}
