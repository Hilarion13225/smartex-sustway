import { Link } from 'react-router-dom';
import { ArrowRight, Film } from 'lucide-react';

/**
 * Un propos d'un côté, son média de l'autre — et l'inverse au bloc suivant.
 *
 * C'est la forme qu'appelle une vidéo posée dans la page : assez large pour
 * qu'on la regarde, accompagnée du texte qui dit ce qu'on va y voir.
 *
 * Deux états, et c'est là tout l'intérêt du composant :
 *
 * — le fichier existe : un lecteur aux commandes natives, sans lecture
 *   automatique, avec `preload="none"` — rien ne part sur le réseau tant que
 *   le visiteur n'a pas cliqué, ce qui évite de faire payer plusieurs mégaoctets
 *   à qui ne regardera pas ;
 * — le fichier n'existe pas encore : un cadre au même rapport 16/9, qui dit ce
 *   qu'il attend. La page Ressources annonce déjà ses rubriques à venir de
 *   cette façon plutôt que de simuler un contenu. Comme les deux états occupent
 *   exactement la même place, déposer la vidéo plus tard ne décalera rien.
 *
 * `ModaleVideo` reste en service et n'est pas dupliqué : il ouvre une vidéo en
 * plein écran depuis un bouton, ce bloc la joue à sa place dans la page.
 *
 * Le texte précède toujours le média dans le DOM ; `inverse` ne déplace que
 * l'affichage. Un lecteur d'écran lit donc le titre avant le média dans les
 * deux sens, et l'ordre de tabulation suit la lecture.
 *
 * Réserve connue : les vidéos n'ont pas de piste de sous-titres. Le jour où un
 * fichier `.vtt` existera, il se branche ici par un `<track kind="captions">`.
 */
export default function BlocMedia({
  ancre,
  libelle,
  titre,
  texte,
  video = null,
  affiche = null,
  attente = 'Vidéo à venir',
  // « none » ne télécharge rien mais laisse un rectangle noir ; « metadata »
  // coûte quelques dizaines de kilo-octets et donne la première image.
  prechargement = 'none',
  action = null,
  inverse = false,
  fond = '',
}) {
  return (
    <section id={ancre} className={`border-b border-ink-200 ${fond}`}>
      <div className="mx-auto grid max-w-[90rem] items-center gap-10 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
        <div className={inverse ? 'lg:order-2' : ''}>
          {libelle ? (
            <p className="flex items-center gap-2.5 text-sm font-semibold text-ink-600">
              <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden />
              {libelle}
            </p>
          ) : null}
          <h2 className="titre-section mt-4 text-ink-900">{titre}</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-600">{texte}</p>
          {action ? (
            <Link
              to={action.vers}
              viewTransition
              className="lien-trait mt-7 inline-flex items-center gap-2 text-base font-semibold text-brand-700"
            >
              {action.libelle}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>

        <div className={inverse ? 'lg:order-1' : ''}>
          {video ? (
            <video
              controls
              preload={prechargement}
              poster={affiche ?? undefined}
              className="aspect-video w-full rounded-[12px] bg-ink-900 object-cover"
            >
              <source src={video} type="video/mp4" />
              Votre navigateur ne sait pas lire cette vidéo.
            </video>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-ink-300 bg-ink-50 px-6 text-center">
              <Film className="h-7 w-7 text-ink-400" strokeWidth={1.5} aria-hidden />
              <p className="text-[15px] font-medium text-ink-600">{attente}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
