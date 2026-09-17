import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import AppelAction from '../components/AppelAction';
import Revele from '../components/Revele';
import ModaleVideo from '../components/ModaleVideo';
import RoueDeming from '../components/vitrine/RoueDeming';
import ChaineEtapes from '../components/vitrine/ChaineEtapes';
import { FONDEMENTS, REFERENCES_METHODOLOGIQUES, SMARTEX } from '../config/smartex';
import photoHero from '../assets/methodologie/banniere.jpg';


/*
 * Chaîne de traitement, du référentiel à l'action corrective. Volontairement
 * décrite du point de vue de ce que l'utilisateur dépose et reçoit : le détail
 * des agents et de leur orchestration n'apprend rien à un visiteur de la
 * vitrine.
 */
const CHAINE = [
  { libelle: 'Référentiels', detail: 'Le cadre applicable à votre secteur' },
  { libelle: 'Questionnaire', detail: 'Adapté à votre activité' },
  { libelle: 'Preuves', detail: 'Vos documents justificatifs' },
  { libelle: 'Agents IA', detail: 'Lecture et confrontation au référentiel' },
  { libelle: 'Conformité', detail: 'Une probabilité par critère' },
  { libelle: 'Risques', detail: 'Hiérarchisés par criticité' },
  { libelle: 'Actions', detail: 'Un plan correctif priorisé' },
];

const PILIERS = ['Environnement', 'Social', 'Gouvernance'];

const classeTitreSection =
  'font-display text-[1.875rem] font-bold leading-[1.08] tracking-[-0.025em] text-ink-900 sm:text-[2.75rem] [text-wrap:balance]';

/**
 * Page « Méthodologie ».
 *
 * Même langage que la page Solution : héros clair, plages Papier et Craie
 * séparées par des filets, listes plutôt que cartes. Le seul dessin est la
 * roue de Deming, et son seul mouvement répond au pointeur.
 */
export default function Methodologie() {
  const [videoOuverte, definirVideoOuverte] = useState(false);

  return (
    <div>
      {/* --------------------------------------------------------- Héros */}
      <section className="border-b border-ink-200">
        <div className="mx-auto grid max-w-[90rem] gap-12 px-5 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-20">
          <div className="min-w-0">
            <h1 className="titre-page max-w-[18ch] text-ink-900">Une méthode claire, du cadrage au plan d’action.</h1>

            <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-ink-600">
              Une démarche transparente et indépendante, fondée sur des référentiels reconnus, sur vos preuves
              documentaires et sur l’intelligence artificielle.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {/* Menait à la section « trois étapes » de cette page ; celle-ci
                  est devenue la page Déploiement. */}
              <Link
                to="/deploiement"
                viewTransition
                className="btn-presse inline-flex min-h-12 items-center justify-center rounded-[4px] bg-brand-600 px-6 text-base font-semibold text-white hover:bg-brand-700"
              >
                Découvrir la démarche
              </Link>
              <button
                type="button"
                onClick={() => definirVideoOuverte(true)}
                className="btn-presse inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[4px] border border-ink-300 px-6 text-base font-semibold text-ink-900 hover:border-ink-900"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden />
                Voir la démonstration
              </button>
            </div>
          </div>

          <figure className="min-w-0">
            {/* Non différée : cette photo est dans le premier écran sur
                téléphone, et la reporter retarderait le plus grand affichage
                de la page. */}
            <img
              src={photoHero}
              alt="Cubes ESG, roue des objectifs de développement durable et plante posés sur un bureau"
              className="aspect-[4/3] w-full rounded-[12px] object-cover"
              loading="eager"
              fetchPriority="high"
            />
            {/* Les trois piliers en légende, là où ils flottaient en cartes
                sur la photo : même information, sans masquer l'image. */}
            <figcaption className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[15px] text-ink-600">
              <span className="text-ink-500">Trois piliers évalués :</span>
              {PILIERS.map((pilier) => (
                <span key={pilier} className="font-semibold text-ink-900">
                  {pilier}
                </span>
              ))}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ------------------------------------------- Démarche en 3 étapes */}

      {/* --------------------------------------------- Amélioration continue */}
      <section className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}>L’<span className="text-brand-600">amélioration continue</span> au cœur de l’approche.</h2>
          <p className="mx-auto mt-4 max-w-[60ch] text-center text-lg leading-relaxed text-ink-600">
            La roue de Deming (PDCA) aide les organisations à sortir de la stagnation et à progresser durablement. Pointez
            une étape pour la situer sur la roue.
          </p>

          <RoueDeming className="mt-12" />
        </div>
      </section>

      {/* ------------------------------------------ Intelligence artificielle */}
      <section className="border-b border-ink-200">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}>De vos preuves au <span className="text-brand-600">plan d’action</span>.</h2>
          <p className="mx-auto mt-4 max-w-[60ch] text-center text-lg leading-relaxed text-ink-600">
            Chaque évaluation suit le même chemin. Vous déposez des documents, l’IA les confronte au référentiel, et vous
            ressortez avec des priorités, pas avec une opinion.
          </p>

          {/* L'enchaînement se lit de gauche à droite sur grand écran, de haut
              en bas sur téléphone. L'accent se déplace d'un maillon à l'autre ;
              aucun libellé n'est jamais masqué. */}
          <ChaineEtapes etapes={CHAINE} />
        </div>
      </section>

      {/* -------------------------------------------------- Nos principes */}
      <section className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}><span className="text-brand-600">Six principes</span> fondent la démarche.</h2>

          {/* Un principe sans description n'affiche que son intitulé : les
              deux derniers n'ont pas encore de définition propre côté métier
              (voir config/smartex.js), et répéter celle du voisin donnerait
              une section qui se contredit elle-même. */}
          <ul className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FONDEMENTS.map((principe, index) => (
              <Revele key={principe.titre} as="li" delai={index * 70} className="border-t border-ink-300 pt-4">
                <h3 className="font-display text-xl font-bold leading-snug text-ink-900">{principe.titre}</h3>
                {principe.texte ? (
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{principe.texte}</p>
                ) : null}
              </Revele>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------- Référentiels et standards */}
      <section>
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 className={`max-w-2xl ${classeTitreSection}`}>Référentiels et standards mobilisés.</h2>
            <Link to="/services" viewTransition className="lien-trait text-base">
              Voir la solution
            </Link>
          </div>

          {/* Grille à filets plutôt que cartes : ce sont des repères que l'on
              parcourt, pas des objets à comparer. La dernière case rappelle le
              référentiel propre à la plateforme, qui complète la rangée. */}
          <ul className="mt-12 grid border-l border-t border-ink-200 sm:grid-cols-2 lg:grid-cols-3">
            {REFERENCES_METHODOLOGIQUES.map((reference) => (
              <li key={reference.code} className="border-b border-r border-ink-200 p-6 sm:p-8">
                <p className="font-display text-xl font-bold text-ink-900">{reference.nom}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{reference.texte}</p>
              </li>
            ))}
            <li className="border-b border-r border-ink-200 bg-surface p-6 sm:p-8">
              <p className="font-display text-xl font-bold text-ink-900">Référentiel {SMARTEX.produit}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                87 critères en 6 parties : le cadre que la plateforme évalue, nourri par ces standards.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <AppelAction
        titre="Une méthode claire, des résultats justifiés."
        texte="Choisissez votre formule et lancez votre première évaluation dès aujourd’hui."
      />

      {videoOuverte ? (
        <ModaleVideo
          source="/videos/methodologie-overview.mp4"
          titre={`Démonstration ${SMARTEX.produit}`}
          surFermeture={() => definirVideoOuverte(false)}
        />
      ) : null}
    </div>
  );
}
