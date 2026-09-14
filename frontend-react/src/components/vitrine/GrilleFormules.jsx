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
import { Alerte } from '../ui';

/**
 * La grille des formules, telle qu'elle s'affiche sur la page Formules.
 *
 * Partagée avec la page Solution pour que les deux montrent exactement les
 * mêmes cartes — même contenu, même mise en forme, mêmes boutons — et ne
 * divergent jamais : toute retouche d'une carte se fait ici.
 *
 * `niveauTitre` règle la balise du nom de formule : `h2` quand la grille est
 * le contenu principal de la page, `h3` sous une section déjà titrée.
 *
 * Refonte « Registre de preuves » : les cartes restent des cartes — ce sont
 * des objets que l'on compare côte à côte — mais sans halo ni fond teinté.
 * La formule mise en avant se distingue par un cadre encre, et les coches
 * sont toutes vertes : elles disent « inclus », jamais « action requise ».
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
        // Trois cartes vides à la place d'un indicateur de chargement : la
        // grille occupe déjà sa place, et la page ne saute pas quand les prix
        // arrivent.
        <div className="grid gap-6 lg:grid-cols-3" aria-busy="true">
          <p className="sr-only" role="status">
            Chargement des formules…
          </p>
          {[0, 1, 2].map((rang) => (
            <div key={rang} className="h-[34rem] rounded-[12px] border border-ink-200 bg-surface p-7" aria-hidden>
              <div className="h-5 w-28 rounded-[4px] bg-ink-100" />
              <div className="mt-3 h-4 w-48 rounded-[4px] bg-ink-100" />
              <div className="mt-8 h-9 w-36 rounded-[4px] bg-ink-100" />
            </div>
          ))}
        </div>
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
            {cartes.map((carte) => {
              const misEnAvant = carte.code === 'AVANCEES';
              const surDevis = carte.code === 'ENTREPRISE';
              const gratuit = !surDevis && Number(carte.prix) === 0;

              return (
                <article
                  key={carte.code}
                  className={clsx(
                    'relative flex h-full flex-col rounded-[12px] border bg-surface p-6 sm:p-7',
                    misEnAvant ? 'border-ink-900 ring-1 ring-ink-900' : 'border-ink-200'
                  )}
                >
                  {/* « Recommandée » et non « Le plus populaire » : un
                      conseil se défend, un classement de ventes demanderait
                      des chiffres qu'on n'affiche pas. */}
                  {misEnAvant ? (
                    <span className="absolute -top-3 left-6 whitespace-nowrap rounded-[4px] bg-ink-900 px-2.5 py-1 text-xs font-semibold text-ink-50">
                      Recommandée
                    </span>
                  ) : null}

                  <Titre className="font-display text-xl font-bold leading-snug text-ink-900">{carte.nom}</Titre>
                  <p className="mt-1 text-[15px] leading-snug text-ink-600">{carte.sousTitre}</p>

                  <p className="mt-6 flex items-baseline gap-2">
                    {surDevis ? (
                      <span className="font-display text-[2.25rem] font-bold leading-none tracking-[-0.02em] text-ink-900">
                        {carte.mentionPrix}
                      </span>
                    ) : (
                      <>
                        {/* Chiffres tabulaires : les prix s'alignent d'une
                            carte à l'autre. */}
                        <span className="font-display text-[2.25rem] font-bold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">
                          {gratuit ? 'Gratuit' : formaterMontant(carte.prix)}
                        </span>
                        {gratuit ? null : <span className="text-sm font-medium text-ink-500">par an</span>}
                      </>
                    )}
                  </p>
                  <p className="mt-2 text-sm leading-snug text-ink-500">
                    {surDevis
                      ? 'Périmètre et accompagnement définis avec vous'
                      : gratuit
                        ? 'Consultation en mode démonstration uniquement'
                        : 'Licence annuelle, renouvelable'}
                  </p>

                  {ACCROCHES[carte.code] ? (
                    <p className="mt-5 text-base font-semibold leading-snug text-ink-900">{ACCROCHES[carte.code]}</p>
                  ) : null}

                  {HERITAGE[carte.code] ? (
                    <p className="mt-5 border-t border-ink-200 pt-5 text-sm font-semibold text-ink-600">
                      {HERITAGE[carte.code]}
                    </p>
                  ) : null}

                  <ul
                    className={clsx(
                      'space-y-3',
                      HERITAGE[carte.code] ? 'mt-4' : 'mt-5 border-t border-ink-200 pt-5'
                    )}
                  >
                    {carte.points.map((point) => (
                      <li key={point} className="flex gap-3 text-[15px] leading-snug text-ink-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-feuille" strokeWidth={2.5} aria-hidden />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  {carte.demarche.length ? (
                    <ul className="mt-4 space-y-3 border-t border-ink-200 pt-4">
                      {carte.demarche.map((point) => (
                        <li key={point} className="flex gap-3 text-[15px] leading-snug text-ink-700">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-feuille" strokeWidth={2.5} aria-hidden />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex-1" />

                  {surDevis ? (
                    <Link
                      to="/contact"
                      viewTransition
                      className="btn-presse mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-[4px] border border-ink-300 px-5 text-base font-semibold text-ink-900 hover:border-ink-900"
                    >
                      Demander un devis
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/inscription?formule=${carte.code}`)}
                      className={clsx(
                        'btn-presse mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-[4px] px-5 text-base font-semibold',
                        misEnAvant
                          ? 'bg-brand-600 text-white hover:bg-brand-700'
                          : 'border border-ink-300 text-ink-900 hover:border-ink-900'
                      )}
                    >
                      Choisir {carte.nom}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-8 flex items-center gap-2 text-[15px] text-ink-600">
        <Lock className="h-4 w-4 shrink-0" aria-hidden />
        Paiement des formules Standard et Avancées via PI-SPI et Wave.
      </p>
    </>
  );
}
