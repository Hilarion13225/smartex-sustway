import { Check, Minus } from 'lucide-react';
import AppelAction from '../components/AppelAction';
import Revele from '../components/Revele';
import GrilleFormules from '../components/vitrine/GrilleFormules';
import ListeQuestions from '../components/vitrine/ListeQuestions';
import { COMPARATIF, QUESTIONS } from '../lib/formules';

/*
 * Les questions que l'on se pose avant de choisir. Elles étaient rendues sur
 * une page « Questions fréquentes » commune ; cette page mêlait la méthodologie, la
 * notation et les tarifs, et aucune page ne portait plus son sujet en entier.
 * Elles reviennent donc ici, là où l'acheteur se décide.
 *
 * La première vient de cette même page et y était classée sous « la
 * démarche » : sa réponse distingue Standard, Avancées et Entreprise, c'est
 * donc une différence d'offre. Elle est reprise mot pour mot, comme les six
 * suivantes, qui restent lues depuis `lib/formules` — une seule source.
 */
const QUESTIONS_AVANT_DE_CHOISIR = [
  {
    question: 'Un expert relit-il les résultats ?',
    reponse:
      'En formule Standard, l’évaluation est réalisée par le pipeline d’agents IA, et chaque critère affiche un indice de confiance. En formules Avancées et Entreprise, un critère dont l’indice de confiance est jugé insuffisant est relu par un expert avant d’être validé.',
  },
  ...QUESTIONS,
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
        <Check className="mx-auto h-5 w-5 text-feuille" strokeWidth={2.5} aria-hidden />
        <span className="sr-only">Inclus</span>
      </>
    );
  }
  if (!valeur) {
    return (
      <>
        <Minus className="mx-auto h-4 w-4 text-ink-300" aria-hidden />
        <span className="sr-only">Non inclus</span>
      </>
    );
  }
  return <span className="text-ink-700">{valeur}</span>;
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

const classeTitreSection =
  'titre-section text-ink-900';

/**
 * Page « Formules ».
 *
 * Elle suit l'ordre des questions d'un acheteur : combien, comment j'achète,
 * qu'est-ce qui est commun, qu'est-ce qui diffère, et les dernières questions.
 * Le comparatif a sa propre section, sur toute la largeur : serré à côté des
 * questions fréquentes, il cassait chaque cellule sur trois lignes.
 */
export default function Formules() {
  return (
    <div>
      {/* --------------------------------------------------------- Héros */}
      <section>
        <div className="mx-auto max-w-[90rem] px-5 pb-10 pt-10 sm:pt-14 lg:pb-12 lg:pt-20">
          {/* Seul titre de la page depuis le retrait du bloc d'introduction.
              Il portait le niveau 1 avec l'apparence d'une étiquette — quatorze
              pixels, là où les autres pages titrent à cinquante-six : la page
              s'ouvrait donc sur une grille de prix sans promesse. */}
          <h1 className="titre-page max-w-[16ch] text-ink-900">Nos formules</h1>
        </div>
      </section>

      {/* ------------------------------------------------ Cartes formules */}
      <section id="grille-formules" className="mx-auto max-w-[90rem] px-5 pb-16 pt-6">
        <GrilleFormules />
      </section>

      {/* ------------------------------------------------ Déroulé de l'achat */}
      <section id="achat" className="border-t border-ink-200">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}>Comment se passe <span className="text-brand-600">l’achat</span>.</h2>
          <p className="mx-auto mt-4 texte-chapo text-center text-ink-600">
            Tout se fait en ligne, en quelques minutes. Pas de rendez-vous nécessaire.
          </p>

          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {ETAPES_ACHAT.map((etape, index) => (
              <Revele key={etape.titre} as="li" delai={index * 70} className="border-t-2 border-ink-900 pt-4">
                <p className="text-sm font-medium tabular-nums text-ink-500">{index + 1}</p>
                <h3 className="mt-1 titre-objet text-ink-900">{etape.titre}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{etape.texte}</p>
              </Revele>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------- Ce que tout le monde a */}
      <section id="inclus" className="border-y border-ink-200 bg-surface">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}>Toutes nos formules <span className="text-brand-600">incluent</span>.</h2>

          {/* Rien d'inventé ici : chaque point reprend une ligne du comparatif
              ou une réponse déjà donnée dans les questions fréquentes. */}
          <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {INCLUS.map((element) => (
              <li key={element.titre} className="border-t border-ink-300 pt-4">
                <h3 className="titre-objet text-ink-900">{element.titre}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{element.texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------ Comparatif */}
      <section id="comparatif" className="border-b border-ink-200">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}>Les formules, <span className="text-brand-600">ligne par ligne</span>.</h2>
          <p className="mx-auto mt-4 texte-chapo text-center text-ink-600">
            Chaque formule contient la précédente. Le tableau montre ce que chacune ajoute.
          </p>

          <p className="mt-8 text-[15px] text-ink-500 sm:hidden">
            Faites défiler le tableau horizontalement pour voir les trois formules.
          </p>
          {/* Défilement contenu dans le tableau : la page, elle, ne déborde
              jamais — `contain:paint` empêche le débordement de remonter
              jusqu'à la page sur téléphone. La première colonne reste collée
              au bord pendant le défilement, pour qu'on sache toujours quelle
              ligne on lit. */}
          <div className="mt-3 overflow-x-auto [contain:paint] sm:mt-10">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <caption className="sr-only">Comparatif des fonctionnalités par formule</caption>
              <thead>
                <tr className="border-b-2 border-ink-900">
                  <th scope="col" className="sticky left-0 z-10 bg-ink-50 py-4 pr-4 text-[15px] font-semibold text-ink-600">
                    Fonctionnalité
                  </th>
                  {COLONNES_COMPARATIF.map((colonne) => (
                    <th
                      key={colonne.code}
                      scope="col"
                      className="w-[22%] px-4 py-4 text-center font-display text-lg font-bold text-ink-900"
                    >
                      {colonne.nom}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARATIF.map((ligne) => (
                  <tr key={ligne.libelle} className="border-b border-ink-200">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-ink-50 py-4 pr-4 text-[15px] font-medium leading-snug text-ink-900"
                    >
                      {ligne.libelle}
                    </th>
                    {COLONNES_COMPARATIF.map((colonne) => (
                      <td key={colonne.code} className="px-4 py-4 text-center text-[15px] leading-snug">
                        <Cellule valeur={ligne[colonne.code]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="questions" className="bg-surface">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}>Vos questions avant de choisir.</h2>
          <ListeQuestions
            questions={QUESTIONS_AVANT_DE_CHOISIR}
            ouverteParDefaut={0}
            className="mx-auto mt-10 max-w-3xl"
          />
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
