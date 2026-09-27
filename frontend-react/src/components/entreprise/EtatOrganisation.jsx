import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, PlayCircle } from 'lucide-react';
import { api } from '../../lib/apiClient';
import { estDansPerimetre, estRenseigne } from '../audit/statutsCritere';

/**
 * Où en est l'organisation, et le geste qui suit.
 *
 * La fiche d'une organisation est un menu de onze cartes à égalité —
 * Non-conformités, Actions correctives, Plans d'amélioration, Rapports RSE…
 * Sur une organisation qui n'a encore rien, quatre d'entre elles mènent à des
 * écrans vides et aucune ne dit par où commencer. Constaté sur une
 * organisation réelle sans mission.
 *
 * Ce bandeau dit l'état, puis mène au seul geste qui ait un sens à ce moment :
 * ouvrir une mission quand il n'y en a pas, reprendre la collecte quand une
 * mission est en cours, consulter le score quand tout est évalué.
 *
 * Il se tait quand il n'a rien à dire — pendant le chargement, ou si l'appel
 * échoue. Un bandeau qui annonce « aucune mission » parce que le réseau a
 * flanché enverrait créer un doublon.
 */
export default function EtatOrganisation({ entrepriseId }) {
  const [etat, definirEtat] = useState(null);

  useEffect(() => {
    let vivant = true;
    api
      .get(`/api/v1/entreprises/${entrepriseId}/audits`)
      .then(async (audits) => {
        const ouvertes = audits.filter((audit) => audit.statut === 'EN_COURS');
        if (ouvertes.length === 0) {
          if (vivant) definirEtat({ missions: audits.length, ouvertes: 0 });
          return;
        }
        /*
         * Les critères eux-mêmes, et non le score.
         *
         * Le score compte les critères notés par l'IA ; le bandeau parle de la
         * collecte, c'est-à-dire des réponses de l'organisation. Sur une
         * mission réelle, l'écart était de 1 contre 4 — la première version de
         * ce bandeau annonçait « il en reste 91 » quand il en restait 88, et
         * reproduisait ici l'incohérence corrigée sur la page d'une mission.
         */
        const lots = await Promise.all(
          ouvertes.map((audit) =>
            api
              .get(`/api/v1/entreprises/${entrepriseId}/audits/${audit.id}/criteres`)
              .then((criteres) => ({ audit, criteres: (criteres ?? []).filter(estDansPerimetre) }))
              .catch(() => null)
          )
        );
        const connus = lots.filter(Boolean);
        const total = connus.reduce((somme, { criteres }) => somme + criteres.length, 0);
        const evalues = connus.reduce(
          (somme, { criteres }) => somme + criteres.filter(estRenseigne).length,
          0
        );
        // La mission où il reste le plus à faire est celle qu'on reprend.
        const aReprendre = [...connus].sort(
          (a, b) =>
            b.criteres.filter((c) => !estRenseigne(c)).length -
            a.criteres.filter((c) => !estRenseigne(c)).length
        )[0]?.audit;
        if (vivant) definirEtat({ missions: audits.length, ouvertes: ouvertes.length, total, evalues, aReprendre });
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, [entrepriseId]);

  if (!etat) return null;

  const { missions, ouvertes, total = 0, evalues = 0, aReprendre } = etat;

  if (missions === 0) {
    return (
      <Bandeau
        Icone={PlayCircle}
        titre="Aucune mission d’audit"
        phrase="Une mission fige le périmètre applicable et ouvre la collecte des réponses. C’est par là que tout commence."
        libelle="Ouvrir une mission"
        vers={`/app/${entrepriseId}/audits`}
      />
    );
  }

  if (ouvertes === 0) {
    return (
      <Bandeau
        Icone={CheckCircle2}
        titre="Aucune mission en cours"
        phrase={`${missions} mission${missions > 1 ? 's' : ''} enregistrée${missions > 1 ? 's' : ''}, aucune ouverte pour l’instant.`}
        libelle="Voir les missions"
        vers={`/app/${entrepriseId}/audits`}
        discret
      />
    );
  }

  const restants = Math.max(0, total - evalues);
  if (restants === 0) {
    return (
      <Bandeau
        Icone={CheckCircle2}
        titre="Collecte terminée"
        phrase={`Les ${total} critères ont reçu une réponse sur ${ouvertes > 1 ? 'les missions ouvertes' : 'la mission ouverte'}.`}
        libelle="Voir le score"
        vers={aReprendre ? `/app/${entrepriseId}/audits/${aReprendre.id}/score` : `/app/${entrepriseId}/audits`}
        discret
      />
    );
  }

  return (
    <Bandeau
      Icone={PlayCircle}
      titre="Collecte en cours"
      phrase={`${evalues} critère${evalues > 1 ? 's' : ''} renseigné${evalues > 1 ? 's' : ''} sur ${total} — il en reste ${restants}.`}
      libelle="Reprendre l’évaluation"
      vers={aReprendre ? `/app/${entrepriseId}/audits/${aReprendre.id}?onglet=criteres` : `/app/${entrepriseId}/audits`}
    />
  );
}

function Bandeau({ Icone, titre, phrase, libelle, vers, discret = false }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <Icone
          className={`mt-0.5 h-5 w-5 shrink-0 ${discret ? 'text-ink-400' : 'text-brand-600 dark:text-brand-400'}`}
          aria-hidden
        />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink-900">{titre}</h2>
          <p className="mt-1 text-sm text-ink-600">{phrase}</p>
        </div>
      </div>
      <Link
        to={vers}
        className={
          discret
            ? 'group inline-flex shrink-0 items-center gap-2 rounded-xl border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-400'
            : 'group inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700'
        }
      >
        {libelle}
        <ArrowRight
          className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </section>
  );
}
