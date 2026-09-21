import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { LineChart } from 'lucide-react';
import { SMARTEX, RESEAUX_SOCIAUX } from '../config/smartex';

/**
 * Colonnes de liens du pied de page — les quatre de la charte.
 *
 * Toutes les destinations sont des pages réellement déclarées dans App.jsx :
 * la route attrape-tout redirigeant vers l'accueil, un libellé sans page
 * renverrait le visiteur à la case départ sans message d'erreur.
 *
 * Le pied porte ici plus que les cinq entrées de la barre de navigation, et
 * c'est sa fonction : Méthodologie, Déploiement et Se former sont des pages à
 * part entière, que la barre laisse de côté pour rester lisible. Sans cette
 * reprise, elles ne seraient plus atteignables que par la recherche.
 */
const COLONNES = [
  {
    titre: 'Solution',
    liens: [
      { vers: '/accueil', libelle: 'Accueil' },
      { vers: '/solution', libelle: 'Solution' },
      { vers: '/fonctionnalites', libelle: 'Fonctionnalités' },
      { vers: '/offres', libelle: 'Offres' },
      { vers: '/formules', libelle: 'Formules et tarifs' },
      { vers: '/methodologie', libelle: 'Méthodologie' },
      { vers: '/deploiement', libelle: 'Déploiement' },
    ],
  },
  {
    titre: 'Ressources',
    liens: [
      { vers: '/ressources', libelle: 'Toutes les ressources' },
      { vers: '/formation', libelle: 'Formations' },
      { vers: '/methodologie#questions', libelle: 'FAQ' },
    ],
  },
  {
    titre: 'SMARTEX',
    liens: [
      { vers: '/services#smartex', libelle: 'À propos' },
      { vers: '/contact', libelle: 'Contact' },
      { href: SMARTEX.siteWeb, libelle: 'Site de SMARTEX Expertises' },
    ],
  },
  {
    titre: 'Légal',
    liens: [
      { vers: '/mentions-legales', libelle: 'Mentions légales' },
      { vers: '/mentions-legales#donnees-personnelles', libelle: 'Politique de confidentialité' },
      { vers: '/mentions-legales#cookies', libelle: 'Cookies' },
      { vers: '/mentions-legales#propriete-intellectuelle', libelle: 'Propriété intellectuelle' },
    ],
  },
];

/**
 * Tracés de marque des réseaux sociaux. lucide-react a retiré ses icônes de
 * marque, les logos officiels sont donc posés ici en tracé SVG.
 */
const TRACES_RESEAUX = {
  linkedin:
    'M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z',
  youtube:
    'M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z',
  x: 'M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z',
};

/**
 * Pied de page de la vitrine.
 *
 * Plage encre plus profonde que le bandeau d'appel qui la précède : les deux
 * se lisent comme deux bandes distinctes, sans filet ni décor entre elles.
 * Couleurs écrites en dur, pour que le pied reste sombre quel que soit le
 * thème actif. Le motif de feuilles en filigrane, les filets rouges sous
 * chaque intitulé et le trait manuscrit sont retirés : ils décoraient sans
 * rien dire.
 */
export default function PiedPublic() {
  const [courriel, definirCourriel] = useState('');

  /*
   * Aucun endpoint d'inscription à la newsletter n'existe côté API : le
   * formulaire ouvre le client de messagerie du visiteur, comme le formulaire
   * de la page Contact. Une fausse confirmation sans destinataire réel serait
   * un mensonge visible.
   */
  const surInscription = (evenement) => {
    evenement.preventDefault();
    const corps = `Merci de m’inscrire à la lettre d’information ${SMARTEX.produit}.\n\nAdresse e-mail : ${courriel}`;
    window.location.href = `mailto:${SMARTEX.email}?subject=${encodeURIComponent(
      'Inscription à la lettre d’information'
    )}&body=${encodeURIComponent(corps)}`;
  };

  return (
    // #102F26 : le vert le plus profond de la charte, un cran sous le Forest
    // de l'appel à l'action qui précède. Les deux plages se distinguent sans
    // filet entre elles. Couleur écrite en dur plutôt qu'en token : le pied
    // reste sombre quel que soit le thème actif.
    <footer className="bg-[#102F26] text-white">
      <div className="mx-auto max-w-[90rem] px-5 pb-10 pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_2fr] lg:gap-14">
          {/* Marque et lettre d'information */}
          <div className="max-w-sm">
            <Link to="/" className="inline-block" aria-label="SMARTEX SustWay, page d’entrée">
              <Logo taille="sm" variante="clair" />
            </Link>
            {/* Signature de la charte. Les quatre verbes disent la démarche dans
                son ordre, et reprennent celui des sections de la page. Posés en
                petites capitales très espacées, ils se lisent comme une devise
                plutôt que comme une phrase — c'est l'espacement qui fait la
                différence, pas la taille. */}
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-growth">
              Structurer <span aria-hidden className="text-growth/50">•</span> Piloter{' '}
              <span aria-hidden className="text-growth/50">•</span> Mesurer{' '}
              <span aria-hidden className="text-growth/50">•</span> Progresser
            </p>
            <p className="mt-3 text-base leading-relaxed text-white/70">
              Une solution de {SMARTEX.editeur} pour structurer, piloter et mesurer la performance RSE, ESG et
              développement durable des organisations.
            </p>

            <form className="mt-8" onSubmit={surInscription}>
              <label className="text-sm font-semibold text-white" htmlFor="pied-newsletter">
                Recevoir nos actualités
              </label>
              {/* 16 px et 48 px de haut : sous 16 px, iOS zoome de lui-même à la
                  mise au point. */}
              <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
                <input
                  id="pied-newsletter"
                  type="email"
                  required
                  value={courriel}
                  onChange={(evenement) => definirCourriel(evenement.target.value)}
                  placeholder="nom@organisation.com"
                  autoComplete="email"
                  className="min-h-12 min-w-0 flex-1 rounded-[4px] border border-white/25 bg-white/5 px-4 text-base text-white outline-none transition placeholder:text-white/40 focus:border-white/70"
                />
                <button
                  type="submit"
                  className="min-h-12 shrink-0 rounded-[4px] bg-white px-5 text-base font-semibold text-[#102F26] transition-colors hover:bg-brand-50"
                >
                  S’inscrire
                </button>
              </div>
            </form>
          </div>

          {/* Colonnes de liens */}
          {/* Deux colonnes sur téléphone, quatre à partir de 640 px : à quatre
              de front sur un écran de 360 px, « Politique de confidentialité »
              passerait sur quatre lignes. */}
          {/* Pas de `col-span` ici : la grille parente n'a que deux colonnes —
              le bloc de marque et celui-ci. Un `lg:col-span-3` hérité de la
              grille à quatre colonnes précédente débordait, ce qui renvoyait
              tout le bloc à la ligne suivante et laissait la moitié droite du
              pied de page vide. */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {COLONNES.map((colonne) => (
              <div key={colonne.titre}>
                <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-white">{colonne.titre}</h2>
                <ul className="mt-4">
                  {colonne.liens.map((lien) => (
                    <li key={lien.vers ?? lien.href}>
                      {/* 44 px de haut sur téléphone : une liste de liens serrés
                          est la zone où le doigt se trompe le plus. */}
                      {lien.href ? (
                        <a
                          href={lien.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex min-h-11 items-center text-[15px] text-white/85 transition-colors hover:text-white sm:min-h-9"
                        >
                          {lien.libelle}
                          <span className="sr-only"> (nouvel onglet)</span>
                        </a>
                      ) : (
                        <Link
                          to={lien.vers}
                          className="flex min-h-11 items-center text-[15px] text-white/85 transition-colors hover:text-white sm:min-h-9"
                        >
                          {lien.libelle}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Barre inférieure */}
        <div className="mt-14 flex flex-col gap-5 border-t border-white/10 pt-6 text-sm text-white/55 lg:flex-row lg:items-center lg:justify-between">
          <p>
            © {new Date().getFullYear()} {SMARTEX.editeur} — Tous droits réservés.
          </p>

          {/*
           * La chaîne de valeur du produit, en clair.
           *
           * C'est la phrase que la charte pose comme critère final : données,
           * mesure, objectifs, actions, progrès, impact. Le pied de page est le
           * dernier endroit où elle peut être lue, et elle y résume en une
           * ligne ce que les cinq pages ont détaillé.
           *
           * Les flèches sont masquées à l'assistance et remplacées par un
           * libellé unique : entendre « flèche » cinq fois de suite n'apprend
           * rien de la progression qu'elles dessinent.
           */}
          <p className="flex items-center gap-2 text-[13px] text-white/70">
            <LineChart className="h-4 w-4 shrink-0 text-growth" strokeWidth={1.75} aria-hidden />
            <span className="sr-only">Chaîne de valeur : des données à l’impact, par la mesure, les objectifs, les actions et les progrès.</span>
            <span aria-hidden className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {['Données', 'Mesure', 'Objectifs', 'Actions', 'Progrès', 'Impact'].map((etape, index) => (
                <span key={etape} className="flex items-center gap-1.5">
                  {index > 0 ? <span className="text-white/35">→</span> : null}
                  {etape}
                </span>
              ))}
            </span>
          </p>
          <ul className="flex items-center gap-2">
            {RESEAUX_SOCIAUX.map((reseau) => (
              <li key={reseau.code}>
                <a
                  href={reseau.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`${SMARTEX.editeur} sur ${reseau.libelle}`}
                  className="flex h-11 w-11 items-center justify-center rounded-[4px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
                    <path d={TRACES_RESEAUX[reseau.code]} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
