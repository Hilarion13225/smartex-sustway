import { BadgeCheck, Building2, Cpu, FileText, ListChecks, Target, Users } from 'lucide-react';
import EtapesMission from '../components/vitrine/EtapesMission';
import ChaineEtapes from '../components/vitrine/ChaineEtapes';
import photoBandeau from '../assets/methodologie/deploiement-banniere.jpg';

/*
 * Le parcours, du point de vue de qui le suit, et non de la chaîne de
 * traitement : l'utilisateur ne voit pas des agents confronter des documents à
 * un référentiel, il dépose des pièces et reçoit un score.
 *
 * Les sept maillons portaient des groupes nominaux possessifs — « Votre
 * mission », « Vos réponses ». Ils sont tous passés à l'infinitif, à votre
 * demande : chacun nomme désormais l'action que l'utilisateur accomplit, et le
 * premier reprend mot pour mot le bouton de la barre de navigation.
 *
 * Deux réserves sur cette forme, à trancher si elle vous gêne. « Lancer
 * l'analyse » et « Consulter votre score » décrivent des opérations que
 * l'utilisateur ne commande pas vraiment : l'analyse part d'elle-même en fin de
 * collecte, comme le dit le détail du maillon, et le score s'affiche sans qu'on
 * le demande.
 *
 * Ces étapes vivaient sur la page Méthodologie, où elles tenaient la section
 * « De vos preuves au plan d'action ». Elles en ont été déplacées telles
 * quelles ; leurs libellés et plusieurs de leurs textes ont changé depuis, sur
 * vos consignes.
 *
 * Chaque maillon portait aussi un repère de temps — « 2 min », « 1 à 2 h »,
 * « quelques minutes » — et une liste de trois points. Les durées étaient des
 * ordres de grandeur que j'avais inventés faute de mesures ; les points, eux,
 * détaillaient chaque étape. Les deux sont retirés à votre demande, si bien
 * qu'un maillon se réduit à son icône, son libellé et une phrase.
 *
 * `repere` et `points` restent facultatifs dans `ChaineEtapes` : les renseigner
 * ici suffit à les faire réapparaître, le jour où l'équipe aura de vraies
 * durées ou voudra remettre le détail.
 */
const CHAINE = [
  {
    libelle: 'Créer un compte',
    detail: 'Compte, organisation, secteur.',
    icone: Building2,
  },
  {
    libelle: 'Cadrer la mission',
    detail: 'Vous nommez le périmètre à évaluer et choisissez le référentiel visé.',
    icone: Target,
  },
  {
    libelle: 'Inviter l’équipe',
    detail: 'Équipe et collaborateurs.',
    icone: Users,
  },
  {
    libelle: 'Répondre au questionnaire',
    detail: 'Six domaines évalués.',
    icone: ListChecks,
  },
  {
    libelle: 'Déposer vos preuves',
    detail: 'Chaque pièce se dépose sur le critère qu’elle étaye, et se retire tant que rien ne s’appuie dessus.',
    icone: FileText,
  },
  {
    libelle: 'Lancer l’analyse',
    detail: 'En fin de collecte, l’IA confronte chaque pièce au critère et cite le passage retenu.',
    icone: Cpu,
  },
  {
    libelle: 'Consulter votre score',
    detail: 'Score par domaine, écarts hiérarchisés par criticité, et plan d’action priorisé.',
    icone: BadgeCheck,
  },
];

/**
 * Comment se déroule un déploiement : les étapes, et ce qui est remis à
 * chacune.
 *
 * Ce contenu vivait dans la page Méthodologie, où il tenait la section
 * « Une démarche en trois étapes ». Il en est déplacé sans un mot changé :
 * la navigation demandée distingue ce sur quoi la solution se fonde — la
 * méthodologie — de la façon dont elle se met en place. La route
 * `/deploiement` existait déjà et redirigeait vers la méthodologie ; elle
 * mène maintenant à ce qu'elle annonce.
 *
 * La page s'ouvre sur le bandeau que vous avez demandé, de la même forme que
 * ceux de Méthodologie et de Formules. C'est lui qui porte le niveau 1 ; le
 * titre des trois étapes, qui l'avait pris entre-temps, redevient un niveau 2.
 *
 * L'image est `deploiement-banniere.jpg`, déjà dans le dépôt et nommée pour
 * cette page. Votre maquette montrait la photo des cubes, mais celle-ci est
 * déjà le fond du bandeau de Méthodologie : deux pages voisines auraient ouvert
 * sur la même image.
 *
 * Les trois étapes donnent la vue d'ensemble ; la frise en sept maillons la
 * déplie, opération par opération. Elles se suivent donc dans cet ordre.
 */
export default function Deploiement() {
  return (
    <>
      {/* ------------------------------------------------------- Bandeau */}
      <section className="relative isolate overflow-hidden bg-marine text-white">
        <img
          src={photoBandeau}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        {/* Voile sombre : l'image est claire, et le blanc y serait illisible
            sans lui. Même taux que sur les deux autres bandeaux. */}
        <div className="absolute inset-0 bg-marine/[0.72]" aria-hidden />

        <div className="relative mx-auto max-w-[90rem] px-5 py-20 text-center sm:py-28">
          <h1 className="text-white">Déploiement de la solution</h1>

        </div>
      </section>

      <EtapesMission />

      {/* ------------------------------------------ Le déroulé, en détail */}
      <section id="chaine" className="border-b border-ink-200">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          {/* « De vos preuves au plan d'action. » et son chapô — « Chaque
              évaluation suit le même chemin… » — sont remplacés par ce seul
              titre, à votre demande. */}
          <h2 className="titre-section mx-auto max-w-3xl text-center text-ink-900">
            Le déroulement de la <span className="text-brand-600">mission</span>
          </h2>

          {/* L'enchaînement se lit de gauche à droite sur grand écran, de haut
              en bas sur téléphone. L'accent se déplace d'un maillon à l'autre ;
              aucun libellé n'est jamais masqué. */}
          <ChaineEtapes etapes={CHAINE} />
        </div>
      </section>
    </>
  );
}
