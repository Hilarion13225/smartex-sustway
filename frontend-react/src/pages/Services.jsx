import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, Play, Scale, ShieldCheck } from 'lucide-react';
import AppelAction from '../components/AppelAction';
import Revele from '../components/Revele';
import ModaleVideo from '../components/ModaleVideo';
import EssaiPreuve from '../components/vitrine/EssaiPreuve';
import afficheHeros from '../assets/methodologie/banniere-hd.jpg';
import SectionOrganisations from '../components/vitrine/SectionOrganisations';
import BentoBenefices from '../components/vitrine/BentoBenefices';
import BlocMedia from '../components/vitrine/BlocMedia';
import SectionPublics from '../components/vitrine/SectionPublics';
import { REFERENTIEL_SMARTEX, SMARTEX } from '../config/smartex';

/*
 * Ce qui lève les derniers doutes avant d'acheter. Chaque point est vrai
 * aujourd'hui : l'accès suit le paiement (parcours d'inscription), la licence
 * est sans reconduction tacite et la sécurité reprend les questions fréquentes.
 */
const REASSURANCE = [
  'Accès dès le paiement validé',
  'Licence annuelle, sans reconduction tacite',
  'Données chiffrées, conformité RGPD',
];

/*
 * Chiffres vérifiables dans la configuration (REFERENTIELS_EVALUABLES) : une
 * ligne de texte, pas un bandeau de compteurs animés.
 */
const FAITS = [
  { valeur: String(REFERENTIEL_SMARTEX.criteres), libelle: `critères dans le référentiel ${SMARTEX.produit}` },
  { valeur: String(REFERENTIEL_SMARTEX.parties), libelle: 'parties d’évaluation' },
  { valeur: '5', libelle: 'référentiels évaluables' },
];

/* L'ordre dans lequel on se sert de la plateforme : une vraie suite. */
const ETAPES = [
  { titre: 'Répondez au questionnaire', texte: 'Il est adapté à votre secteur et bâti sur des référentiels reconnus.' },
  { titre: 'Déposez vos preuves', texte: 'Politiques, rapports, procédures : vos documents justifient vos réponses.' },
  { titre: 'L’IA analyse', texte: 'Chaque document est confronté au critère. Chaque verdict cite sa source.' },
  { titre: 'Voyez vos priorités', texte: 'Score, écarts et risques sont classés. Vous savez par où commencer.' },
  { titre: 'Suivez vos progrès', texte: 'Plan d’action, rapport exportable et nouvelle évaluation quand vous êtes prêt.' },
];

/*
 * Les trois valeurs, en pastilles rondes plutôt qu'en blocs à filet : c'est la
 * forme que la planche donne à ce genre de rangée, et trois repères courts s'y
 * lisent d'un balayage. Les textes ne changent pas ; l'icône ne fait que
 * doubler le titre, elle ne porte aucune information à elle seule et reste
 * donc masquée aux lecteurs d'écran.
 */
const VALEURS = [
  { titre: 'Indépendance', texte: 'Une évaluation objective et impartiale.', icone: Scale },
  { titre: 'Robustesse', texte: 'Une méthodologie fiable et éprouvée.', icone: ShieldCheck },
  { titre: 'Transparence', texte: 'Des résultats clairs, chacun justifié.', icone: Eye },
];

const classeTitreSection =
  'titre-section text-ink-900';
const classeLienSouligne =
  'inline-flex min-h-12 items-center self-start text-base font-semibold text-ink-900 underline decoration-ink-300 underline-offset-[6px] transition-colors hover:decoration-brand-600 lg:self-auto';

/**
 * Page « Solution » : la page de présentation de la vitrine (l'ancienne page
 * /accueil y est fusionnée et redirige ici).
 *
 * Elle suit le chemin d'un acheteur : comprendre ce que fait la solution, voir
 * comment elle marche et ce qu'elle rapporte, se reconnaître, voir le prix,
 * savoir qui est derrière — puis choisir une formule. SMARTEX Expertises tient
 * en un bloc : l'entreprise a son propre site, vers lequel on renvoie.
 */
export default function Services() {
  const [videoOuverte, definirVideoOuverte] = useState(false);
  const videoFond = useRef(null);

  // La vidéo part seule et tourne en boucle, sur décision explicite, et sans
  // commande d'arrêt : c'est un choix assumé du propriétaire du site. Le seul
  // garde-fou conservé est celui qui ne dépend pas du goût — sous « réduire
  // les animations », elle ne démarre pas, et son affiche tient lieu de fond.
  useEffect(() => {
    const element = videoFond.current;
    if (!element) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) element.pause();
  }, []);


  return (
    <div>
      {/* --------------------------------------------------------- Héros */}
      {/* Bandeau plein, média en fond et titraille centrée par-dessus. Les deux
          colonnes précédentes faisaient lire le titre et manipuler la
          démonstration en même temps ; la démonstration a sa propre section
          juste en dessous, et l'ouverture ne dit plus qu'une chose.

          La vidéo est muette, en boucle, et ne porte aucune information : le
          texte se suffit. Elle s'arrête au bouton, et ne démarre pas du tout
          sous « réduire les animations » — l'affiche tient alors lieu de fond.
          WCAG 2.2.2 l'exige pour tout mouvement dépassant cinq secondes. */}
      <section className="relative isolate overflow-hidden bg-marine text-white">
        <video
          ref={videoFond}
          poster={afficheHeros}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/videos/methodologie-overview.mp4" type="video/mp4" />
        </video>

        <div className="relative mx-auto max-w-[90rem] px-5 pb-16 pt-16 text-center sm:pb-20 sm:pt-24">
          <h1 className="mx-auto max-w-[18ch] text-white">Votre démarche RSE, ESG et DD, notée sur vos preuves.</h1>

          <p className="mx-auto mt-6 texte-chapo text-center text-white/80">
            Vous déposez vos documents. L’IA les compare au référentiel. Chaque critère reçoit un verdict, justifié
            par un passage de vos preuves.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/formules#grille-formules"
              className="inline-flex min-h-12 items-center justify-center rounded-[4px] bg-brand-600 px-6 text-base font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Choisir une formule
            </Link>
            <button
              type="button"
              onClick={() => definirVideoOuverte(true)}
              className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[4px] border border-white/40 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden />
              Voir la démonstration
            </button>
          </div>

          <ul className="mt-9 flex flex-col items-center justify-center gap-2.5 text-[15px] text-white/85 sm:flex-row sm:flex-wrap sm:gap-x-8">
            {REASSURANCE.map((point) => (
              <li key={point} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-[#3FB488]" strokeWidth={2.5} aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Les repères du référentiel, en pied de héros. */}
        <div className="relative border-t border-white/15">
          <ul className="mx-auto flex max-w-[90rem] flex-col gap-3 px-5 py-7 text-[15px] text-white/80 sm:flex-row sm:flex-wrap sm:gap-x-10">
            {FAITS.map((fait) => (
              <li key={fait.libelle}>
                <b className="chiffre-cle sur-sombre mr-1.5 inline-block align-baseline">{fait.valeur}</b>{' '}
                {fait.libelle}
              </li>
            ))}
          </ul>
        </div>

      </section>

      {/* ---------------------------------------------- La preuve, jouée */}
      <section id="essai" className="border-b border-ink-200">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="titre-section text-ink-900">
              Voyez l’IA <span className="text-brand-600">juger une preuve</span>.
            </h2>
            <p className="mx-auto mt-4 texte-chapo text-center text-ink-600">
              Un pilier, une pièce déposée, un verdict. C’est exactement ce que fait la plateforme sur vos documents.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <EssaiPreuve />
          </div>
        </div>
      </section>

      <SectionOrganisations />

      {/* ------------------------------------------------ Comment ça marche */}
      <section id="fonctionnement" className="border-b border-ink-200">
        <div className="mx-auto max-w-[90rem] px-5 py-16 sm:py-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 className={`max-w-2xl ${classeTitreSection}`}>Comment ça marche.</h2>
            <Link to="/methodologie" viewTransition className={classeLienSouligne}>
              Lire la méthodologie
            </Link>
          </div>

          {/* Le rang porte l'information de cette section : c'est une suite, et
              l'ordre est ce qu'elle apprend. Les numéros prennent donc la voix
              que le système réserve aux repères chiffrés — celle du bandeau de
              faits plus haut — au lieu du gris de 14 px qui les rangeait au
              niveau d'une légende. Le filet passe de 2 px à 1 px en échange :
              la colonne reste tenue, et le chiffre porte seul. */}
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6 lg:grid-rows-[auto_auto_1fr]">
            {ETAPES.map((etape, index) => (
              <Revele key={etape.titre} as="li" delai={index * 70} className="border-t border-ink-900 pt-5 lg:row-span-3 lg:grid lg:grid-rows-subgrid lg:gap-0">
                <p className="chiffre-cle">{index + 1}</p>
                <h3 className="mt-3 titre-objet text-ink-900">{etape.titre}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{etape.texte}</p>
              </Revele>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------- La démonstration */}
      {/* Place tenue pour la vidéo de démonstration du produit : le visiteur
          vient de lire le déroulé en cinq étapes, c'est ici qu'il voudra le
          voir tourner. Le cadre occupe déjà le format du lecteur, déposer
          `public/videos/demo-produit.mp4` suffira à le remplir. */}
      <BlocMedia
        ancre="demonstration"
        libelle="La plateforme en mouvement"
        titre="Voir une évaluation se dérouler."
        texte="Du dépôt d'une pièce justificative au verdict rendu sur un critère, la démonstration suit le chemin complet d'une évaluation."
        video="https://smartex-sustway.smartex-expertises.com/videos/sllide.mp4"
        prechargement="metadata"
        action={{ libelle: 'Lire la méthodologie en attendant', vers: '/methodologie' }}
        inverse
        fond="bg-surface"
      />

      {/* ------------------------------------------------ Ce que vous y gagnez */}
      <BentoBenefices ancre="benefices" />

      <SectionPublics ancre="organisations" />


      {/* ----------------------------------------------- Qui est derrière */}
      <section id="smartex" className="border-b border-ink-200 bg-surface">
        <div className="mx-auto grid max-w-[90rem] gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <h2 className={`mx-auto max-w-3xl text-center ${classeTitreSection}`}>Une solution de {SMARTEX.editeur}.</h2>
            <p className="mx-auto mt-4 texte-chapo text-center text-ink-600">
              {SMARTEX.editeur} fait du conseil, de l’audit et des outils numériques pour la performance durable.
              {' '}
              {SMARTEX.produit} met cette expertise dans une plateforme.
            </p>
            <a
              href={SMARTEX.siteWeb}
              target="_blank"
              rel="noreferrer noopener"
              className={`mt-4 ${classeLienSouligne}`}
            >
              Découvrir {SMARTEX.editeur}
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </div>

          <dl className="grid gap-8 self-center sm:grid-cols-3 lg:grid-cols-1 lg:gap-7">
            {VALEURS.map((valeur) => (
              <div key={valeur.titre} className="lg:flex lg:items-start lg:gap-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-marine text-white">
                  <valeur.icone className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                </span>
                <div className="mt-4 lg:mt-1">
                  <dt className="titre-objet text-ink-900">{valeur.titre}</dt>
                  <dd className="mt-1 text-[15px] leading-relaxed text-ink-600">{valeur.texte}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <AppelAction diagonale />

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
