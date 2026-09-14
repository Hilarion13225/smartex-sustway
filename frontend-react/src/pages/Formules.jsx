import { Link } from 'react-router-dom';
import AppelAction from '../components/AppelAction';
import GrilleFormules from '../components/vitrine/GrilleFormules';
import ListeQuestions from '../components/vitrine/ListeQuestions';
import { Check } from 'lucide-react';
import { COMPARATIF, QUESTIONS } from '../lib/formules';
import Revele from '../components/Revele';
import { Etiquette } from '../components/vitrine/communs';
import { SMARTEX } from '../config/smartex';

const AVANTAGES = [
  'Des fonctionnalités adaptées à vos besoins',
  'Un accompagnement à chaque étape',
  'Une licence annuelle, sans reconduction tacite',
];

/*
 * Colonnes du comparatif. Les valeurs de COMPARATIF sont écrites pour ces trois
 * offres : les colonnes le sont aussi, et restent lisibles même si l'API des
 * formules ne répond pas.
 */
const COLONNES_COMPARATIF = [
  { code: 'STANDARD', nom: 'Standard' },
  { code: 'AVANCEES', nom: 'Avancées' },
  { code: 'ENTREPRISE', nom: 'Entreprise' },
];

/** Cellule du comparatif : booléen, valeur textuelle, ou absence. */
function Cellule({ valeur }) {
  if (valeur === true) {
    return (
      <>
        <Check className="mx-auto h-4 w-4 text-feuille" aria-hidden />
        <span className="sr-only">Inclus</span>
      </>
    );
  }
  if (!valeur) {
    return (
      <>
        <span className="text-ink-300" aria-hidden>
          —
        </span>
        <span className="sr-only">Non inclus</span>
      </>
    );
  }
  return <span className="text-ink-600">{valeur}</span>;
}

/*
 * Socle commun aux trois formules. Chaque ligne est déjà affirmée ailleurs sur
 * la page — dans le comparatif ou dans les questions fréquentes — plutôt que
 * d'être une promesse commerciale ajoutée pour l'occasion.
 */
const INCLUS = [
  {
    titre: 'Accès à la plateforme',
    texte: 'Questionnaire RSE et ESG adapté à votre secteur d’activité.',
  },
  {
    titre: 'Analyse IA des preuves',
    texte: 'Vos documents confrontés au référentiel, avec un niveau de profondeur selon la formule.',
  },
  {
    titre: 'Sécurité des données',
    texte: 'Chiffrement au repos et en transit, isolation par entreprise, conformité RGPD.',
  },
  {
    titre: 'Licence annuelle',
    texte: 'Renouvelable, sans reconduction automatique tacite.',
  },
];

/*
 * Le parcours réel de /inscription pour une formule payante (formule, compte
 * et entreprise, vérification, paiement, confirmation) : on montre au
 * visiteur ce qui l'attend avant qu'il clique, pour que le paiement ne soit
 * pas une surprise.
 */
const ETAPES_ACHAT = [
  { titre: 'Choisissez votre formule', texte: 'Standard ou Avancées. Vous pourrez en changer plus tard.' },
  { titre: 'Créez votre compte', texte: 'Vos coordonnées et celles de votre entreprise.' },
  { titre: 'Confirmez votre e-mail', texte: 'Vous recevez un code de vérification.' },
  { titre: 'Payez en ligne', texte: 'Par PI-SPI ou Wave, en toute sécurité.' },
  { titre: 'Commencez tout de suite', texte: 'La plateforme s’ouvre dès le paiement validé.' },
];

export default function Formules() {
  return (
    <div>
      {/* --------------------------------------------------------- Héros */}
      <section>
        <div className="mx-auto max-w-[75rem] px-5 pb-10 pt-10 sm:pt-14 lg:pb-12 lg:pt-20">
          <p className="sur-titre">Nos formules</p>
          <h1 className="titre-page mt-4 max-w-[20ch] text-ink-900">Choisissez la formule adaptée à vos besoins.</h1>
          <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-ink-600">
            Quelle que soit la taille de votre structure, {SMARTEX.editeur} vous propose des formules simples. Vous
            évoluez à votre rythme vers une performance durable.
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-[15px] text-ink-700 sm:flex-row sm:flex-wrap sm:gap-x-8">
            {AVANTAGES.map((avantage) => (
              <li key={avantage} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-feuille" strokeWidth={2.5} aria-hidden />
                {avantage}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------ Cartes formules */}
      <section id="grille-formules" className="mx-auto max-w-[80rem] scroll-mt-24 px-5 pb-16 pt-4">
        <GrilleFormules />
      </section>

      {/* ------------------------------------------------ Déroulé de l'achat */}
      <section className="border-t border-ink-200">
        <div className="mx-auto max-w-[75rem] px-5 py-14 sm:py-16">
          <h2 className="font-display text-[1.875rem] font-bold leading-[1.08] tracking-[-0.025em] text-ink-900 sm:text-[2.25rem] [text-wrap:balance]">
            Comment se passe l’achat
          </h2>
          <p className="mt-3 max-w-[56ch] text-lg leading-relaxed text-ink-600">
            Tout se fait en ligne, en quelques minutes. Pas de rendez-vous nécessaire.
          </p>

          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {ETAPES_ACHAT.map((etape, index) => (
              <li key={etape.titre} className="border-t-2 border-ink-900 pt-4">
                <p className="text-sm font-medium tabular-nums text-ink-400">{index + 1}</p>
                <h3 className="mt-1 font-display text-lg font-bold leading-snug text-ink-900">{etape.titre}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{etape.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------- Ce que tout le monde a */}
      <section className="border-y border-ink-200 bg-surface">
        <div className="mx-auto max-w-[75rem] px-5 py-14 sm:py-16">
          <h2 className="font-display text-[1.875rem] font-bold leading-[1.08] tracking-[-0.025em] text-ink-900 sm:text-[2.25rem]">
            Toutes nos formules incluent
          </h2>

          {/* Rien d'inventé ici : chaque point reprend une ligne du comparatif
              ou une réponse déjà donnée dans les questions fréquentes. */}
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {INCLUS.map((element) => (
              <li key={element.titre} className="border-t border-ink-300 pt-4">
                <h3 className="font-display text-lg font-bold leading-snug text-ink-900">{element.titre}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{element.texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------ Comparatif et questions */}
      <section className="mx-auto max-w-[80rem] px-5 pb-20 pt-16">
        <div className="grid gap-14 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
          {/* Comparatif */}
          <div className="min-w-0">
            <Revele>
              <Etiquette>Comparatif des fonctionnalités</Etiquette>
              <h2 className="mt-4 font-display text-[1.875rem] font-bold leading-[1.08] tracking-[-0.025em] text-ink-900 sm:text-[2.5rem] [text-wrap:balance]">
                Un aperçu des fonctionnalités par formule.
              </h2>
            </Revele>

            <Revele delai={120} className="mt-8 min-w-0">
              <p className="mb-2 text-sm text-ink-500 lg:hidden">
                Faites défiler le tableau horizontalement pour voir toutes les formules.
              </p>
              {/* Défilement contenu dans le tableau : la page, elle, ne déborde jamais. */}
              {/* `contain:paint` en plus de `overflow-x-auto` : sans lui, le
                  débordement du tableau remonte jusqu'à la page, qui devient
                  défilable latéralement de 126 px sur téléphone. */}
              <div className="overflow-x-auto rounded-2xl border border-ink-100 [contain:paint]">
                <table className="w-full min-w-[34rem] border-collapse text-left">
                  <thead>
                    <tr className="bg-ink-50 dark:bg-ink-100/40">
                      <th scope="col" className="px-4 py-3 text-[13px] font-bold text-marine">
                        Fonctionnalités
                      </th>
                      {COLONNES_COMPARATIF.map((carte) => (
                        <th
                          key={carte.code}
                          scope="col"
                          className="px-4 py-3 text-center text-[13px] font-bold text-marine"
                        >
                          {carte.nom}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {COMPARATIF.map((ligne) => (
                      <tr key={ligne.libelle}>
                        <th scope="row" className="px-4 py-3 text-[13px] font-normal leading-snug text-ink-700">
                          {ligne.libelle}
                        </th>
                        {COLONNES_COMPARATIF.map((carte) => (
                          <td key={carte.code} className="px-4 py-3 text-center text-[13px]">
                            <Cellule valeur={ligne[carte.code]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Revele>
          </div>

          {/* Questions fréquentes */}
          <div className="min-w-0">
            <Revele>
              <Etiquette>Questions fréquentes</Etiquette>
              <h2 className="mt-4 font-display text-[1.875rem] font-bold leading-[1.08] tracking-[-0.025em] text-ink-900 sm:text-[2.5rem] [text-wrap:balance]">
                Des réponses à vos questions.
              </h2>
            </Revele>

            <ListeQuestions questions={QUESTIONS} className="mt-8" />

            <Link to="/faq" viewTransition className="lien-trait mt-6 text-base">
              Voir toutes les questions
            </Link>
          </div>
        </div>
      </section>

      <AppelAction
        titre="Besoin d’une offre sur mesure ?"
        texte="Décrivez-nous votre périmètre et vos échéances : nous revenons vers vous avec la démarche adaptée."
        action={{ libelle: 'Nous contacter', vers: '/contact' }}
        secondaire={{ libelle: 'Lire la méthodologie', vers: '/methodologie' }}
      />
    </div>
  );
}
