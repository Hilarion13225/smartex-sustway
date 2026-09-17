import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Building2, Cpu, FileText, ListChecks, Play, Target, Users } from 'lucide-react';
import AppelAction from '../components/AppelAction';
import Revele from '../components/Revele';
import ModaleVideo from '../components/ModaleVideo';
import RoueDeming from '../components/vitrine/RoueDeming';
import ChaineEtapes from '../components/vitrine/ChaineEtapes';
import ListeQuestions from '../components/vitrine/ListeQuestions';
import BandeauReferentiels from '../components/vitrine/BandeauReferentiels';
import BlocMedia from '../components/vitrine/BlocMedia';
import { FONDEMENTS, REFERENCES_METHODOLOGIQUES, REFERENTIEL_SMARTEX, SMARTEX } from '../config/smartex';
import photoHero from '../assets/methodologie/banniere.jpg';
import afficheVideo from '../assets/methodologie/banniere-hd.jpg';

/*
 * Les questions que pose la méthodologie elle-même. Elles vivaient dans une page
 * « Questions fréquentes » commune à tous les sujets ; une telle page mêlait
 * la notation, les tarifs et la confidentialité, si bien qu'aucune page ne
 * portait plus son propre sujet en entier. Les réponses sont reprises mot pour
 * mot ; celles qui traitent des formules et du paiement sont allées sur la
 * page Formules.
 */
const QUESTIONS_METHODE = [
  {
    question: 'À qui s’adresse la plateforme ?',
    reponse:
      'Aux entreprises qui doivent structurer leur démarche RSE : première évaluation, préparation d’un audit externe ou constitution d’un dossier auprès d’un bailleur. Le questionnaire s’adapte au secteur et à la taille déclarés.',
  },
  {
    question: 'Comment la note est-elle calculée ?',
    reponse:
      'Le pipeline IA estime une probabilité de conformité par critère, convertie en niveau d’engagement de 1 à 5. La note obtenue est le produit du niveau et du coefficient du critère ; le score est la somme des notes obtenues divisée par la somme des coefficients, sur les seuls critères actifs.',
  },
  {
    question: 'La criticité influence-t-elle le score ?',
    reponse:
      'Non. La criticité sert uniquement à calculer le risque attendu et donc l’ordre de priorité des actions correctives. Elle n’entre jamais dans le calcul du score.',
  },
  {
    question: 'Que signifie l’indice de préparation aux financements verts ?',
    reponse:
      'C’est une mesure d’alignement aux 8 Performance Standards du bailleur pilote, restreinte aux critères concernés. Il indique le niveau de préparation du dossier : ce n’est pas une garantie d’éligibilité ni une décision de financement.',
  },
];



/*
 * Chaîne de traitement, du référentiel à l'action corrective. Volontairement
 * décrite du point de vue de ce que l'utilisateur dépose et reçoit : le détail
 * des agents et de leur orchestration n'apprend rien à un visiteur de la
 * vitrine.
 */
/*
 * Le parcours, du point de vue de qui le suit — « votre espace », « vos
 * réponses » — et non plus de la chaîne de traitement. Les mêmes opérations
 * s'y retrouvent, dites du côté de l'utilisateur : il ne voit pas des agents
 * confronter des documents à un référentiel, il dépose des pièces et reçoit
 * un score.
 *
 * ⚠ Les durées sont des ordres de grandeur, pas des mesures. Elles attendent
 * les chiffres réels de l'équipe ; seul « immédiat » est certain, le score
 * étant calculé à la volée.
 */
const CHAINE = [
  {
    libelle: 'Votre espace',
    repere: '2 min',
    detail: 'Compte, organisation, secteur. Rien à installer : SMARTEX SustWay est un service en ligne.',
    points: ['Un espace par organisation', 'Aucune installation', 'Accès dès le paiement validé'],
    icone: Building2,
  },
  {
    libelle: 'Votre mission',
    repere: '3 min',
    detail: 'Vous nommez le périmètre à évaluer et choisissez le référentiel visé.',
    points: ['Périmètre déclaré', `Référentiel ${SMARTEX.produit} · ${REFERENTIEL_SMARTEX.criteres} critères`, 'Mission cadrée'],
    icone: Target,
  },
  {
    libelle: 'Votre équipe',
    repere: '2 min',
    detail: 'Une évaluation ne se remplit pas seule. Chaque partie va à qui la maîtrise.',
    points: ['Invitations par lien', 'Rôles par organisation', 'Accès limité à la mission'],
    icone: Users,
  },
  {
    libelle: 'Vos réponses',
    repere: '1 à 2 h',
    detail: 'Six parties d’évaluation, critère par critère. Aucun jargon d’auditeur.',
    points: ['6 parties d’évaluation', 'Enregistré au fil de l’eau', 'Reprise à tout moment'],
    icone: ListChecks,
  },
  {
    libelle: 'Vos preuves',
    repere: 'au fil des réponses',
    detail: 'Chaque pièce se dépose sur le critère qu’elle étaye, et se retire tant que rien ne s’appuie dessus.',
    points: ['Une pièce par critère', 'Politiques, rapports, procédures', 'Retirables avant analyse'],
    icone: FileText,
  },
  {
    libelle: 'L’analyse',
    repere: 'quelques minutes',
    detail: 'En fin de collecte, l’IA confronte chaque pièce au critère et cite le passage retenu.',
    points: ['Lancée en fin de collecte', 'Une probabilité par critère', 'Le passage retenu est cité'],
    icone: Cpu,
  },
  {
    libelle: 'Votre score',
    repere: 'immédiat',
    detail: 'Score par domaine, écarts hiérarchisés par criticité, et plan d’action priorisé.',
    points: ['Score et niveau d’engagement', 'Écarts nommés et hiérarchisés', 'Rapport et plan d’action'],
    icone: BadgeCheck,
  },
];

const PILIERS = ['Environnement', 'Social', 'Gouvernance'];

const classeTitreSection =
  'titre-section text-ink-900';

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
            <h1 className="titre-page max-w-[18ch] text-ink-900">Une méthodologie claire, du cadrage au plan d’action.</h1>

            <p className="mt-6 texte-chapo text-ink-600">
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

      <BandeauReferentiels />

      {/* ------------------------------------------- Démarche en 3 étapes */}

      {/* ------------------------------------------------ La méthodologie en vidéo */}
      {/* La vidéo existait déjà mais ne s'ouvrait qu'en modale, depuis un
          bouton du héros : elle se joue maintenant dans la page, à l'endroit
          où l'on cherche à comprendre la démarche. Les boutons qui ouvrent la
          modale restent en place. Colonnes inversées par rapport au bloc de
          l'accueil, pour que les deux ne se répètent pas. */}
      <BlocMedia
        ancre="video"
        libelle="La méthodologie expliquée"
        titre="La démarche, en quelques minutes."
        texte="Ce que la plateforme évalue, comment elle confronte une pièce à un critère, et ce que le rapport final contient."
        video="/videos/methodologie-overview.mp4"
        affiche={afficheVideo}
      />

      {/* --------------------------------------------- Amélioration continue */}
      <section id="amelioration" className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}>L’<span className="text-brand-600">amélioration continue</span> au cœur de l’approche.</h2>
          <p className="mx-auto mt-4 texte-chapo text-center text-ink-600">
            La roue de Deming (PDCA) aide les organisations à sortir de la stagnation et à progresser durablement. Pointez
            une étape pour la situer sur la roue.
          </p>

          <RoueDeming className="mt-12" />
        </div>
      </section>

      {/* ------------------------------------------ Intelligence artificielle */}
      <section id="chaine" className="border-b border-ink-200">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}>De vos preuves au <span className="text-brand-600">plan d’action</span>.</h2>
          <p className="mx-auto mt-4 texte-chapo text-center text-ink-600">
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
      <section id="principes" className="border-b border-ink-200 bg-surface">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}><span className="text-brand-600">Six principes</span> fondent la démarche.</h2>

          {/* Un principe sans description n'affiche que son intitulé : les
              deux derniers n'ont pas encore de définition propre côté métier
              (voir config/smartex.js), et répéter celle du voisin donnerait
              une section qui se contredit elle-même. */}
          <ul className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FONDEMENTS.map((principe, index) => (
              <Revele key={principe.titre} as="li" delai={index * 70} className="border-t border-ink-300 pt-4">
                <h3 className="titre-objet text-ink-900">{principe.titre}</h3>
                {principe.texte ? (
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{principe.texte}</p>
                ) : null}
              </Revele>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------- Référentiels et standards */}
      <section id="referentiels">
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
                <p className="titre-objet text-ink-900">{reference.nom}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{reference.texte}</p>
              </li>
            ))}
            <li className="border-b border-r border-ink-200 bg-surface p-6 sm:p-8">
              <p className="titre-objet text-ink-900">Référentiel {SMARTEX.produit}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                {REFERENTIEL_SMARTEX.criteres} critères en {REFERENTIEL_SMARTEX.parties} parties : le cadre que la
                plateforme évalue, nourri par ces standards.
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* --------------------------------------- Questions sur la méthodologie */}
      <section id="questions" className="border-t border-ink-200 bg-surface">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <h2 className="titre-section max-w-2xl text-ink-900">Questions fréquentes.</h2>
          <ListeQuestions questions={QUESTIONS_METHODE} ouverteParDefaut={0} className="mt-10 max-w-3xl" />
        </div>
      </section>

      <AppelAction
        titre="Une méthodologie claire, des résultats justifiés."
        texte="Chaque note s’appuie sur une pièce que vous avez déposée, et chaque écart sur la règle qui le fonde."
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
