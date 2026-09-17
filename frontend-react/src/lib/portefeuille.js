import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './apiClient';
import { formaterDate } from './export';

/**
 * La collecte du portefeuille, écrite une fois.
 *
 * L'API n'expose aucun endpoint d'agrégation multi-organisations : ni
 * `EntrepriseDto`, ni aucune ressource ne rend le nombre de missions, le score
 * ou les écarts d'une organisation. Chaque écran qui en a besoin doit donc
 * boucler — une requête par organisation, puis quatre par mission.
 *
 * Le tableau de bord, le classement, la comparaison et l'en-tête le faisaient
 * chacun de leur côté, avec des variantes. Rien ne garantissait que leurs
 * chiffres concordent, et corriger la règle à un endroit laissait les trois
 * autres en arrière. Le volume de requêtes est inchangé : ce sont les mêmes,
 * appelées depuis un seul endroit.
 *
 * Chaque appel est rattrapé individuellement : une organisation dont les
 * missions échouent n'emporte pas le reste du portefeuille.
 */
export function usePortefeuille(entreprises, { avecJournal = false } = {}) {
  const [missions, setMissions] = useState([]);
  const [journal, setJournal] = useState([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);

    const parEntreprise = await Promise.all(
      (entreprises ?? []).map(async (entreprise) => {
        const audits = await api.get(`/api/v1/entreprises/${entreprise.id}/audits`).catch(() => []);
        return Promise.all(
          (audits ?? []).map(async (audit) => {
            const [score, nonConformites, points, plans] = await Promise.all([
              api.get(`/api/v1/entreprises/${entreprise.id}/audits/${audit.id}/score`).catch(() => null),
              api.get(`/api/v1/entreprises/${entreprise.id}/audits/${audit.id}/non-conformites`).catch(() => []),
              api.get(`/api/v1/entreprises/${entreprise.id}/audits/${audit.id}/score-historique`).catch(() => []),
              api.get(`/api/v1/entreprises/${entreprise.id}/audits/${audit.id}/plans-action`).catch(() => []),
            ]);
            return { entreprise, audit, score, nonConformites: nonConformites ?? [], points, plans };
          })
        );
      })
    );
    setMissions(parEntreprise.flat());

    // Le journal est réservé à l'administration de l'entreprise : l'appeler
    // sans ce droit produit un 403 par organisation, visible en console et
    // sans effet utile. On s'abstient plutôt que de rattraper l'erreur.
    const journaux = avecJournal
      ? await Promise.all(
          (entreprises ?? []).map((entreprise) =>
            api
              .get(`/api/v1/entreprises/${entreprise.id}/journal`)
              .then((entrees) => (entrees ?? []).map((e) => ({ ...e, entreprise })))
              .catch(() => [])
          )
        )
      : [];
    setJournal(journaux.flat());

    setChargement(false);
  }, [entreprises, avecJournal]);

  useEffect(() => {
    charger();
  }, [charger]);

  const historique = useMemo(() => missions.flatMap((m) => m.points ?? []), [missions]);

  return { missions, historique, journal, chargement, recharger: charger };
}

/**
 * La mission la plus récente de chaque organisation, avec son score.
 *
 * Besoin plus étroit que `usePortefeuille`, et volontairement distinct : le
 * classement et la comparaison ne s'intéressent qu'à l'état courant d'une
 * démarche. Leur faire charger toutes les missions et leurs quatre ressources
 * multiplierait leurs requêtes sans rien leur apprendre — la mutualisation ne
 * vaut que lorsque le besoin est le même.
 *
 * Ce n'est pas un hook : le classement l'appelle au montage, la comparaison
 * seulement quand on lui demande de comparer une sélection.
 */
export async function chargerDernieresMissions(entreprises) {
  return Promise.all(
    (entreprises ?? []).map(async (entreprise) => {
      const audits = await api.get(`/api/v1/entreprises/${entreprise.id}/audits`).catch(() => []);
      // Mission la plus récente : celle qui décrit l'état courant, là où
      // agréger toutes les missions mélangerait des évaluations séparées par
      // des années.
      const derniere = [...(audits ?? [])].sort(
        (a, b) => new Date(b.dateDebut) - new Date(a.dateDebut)
      )[0];
      if (!derniere) return { entreprise, mission: null, audit: null, score: null };
      const score = await api
        .get(`/api/v1/entreprises/${entreprise.id}/audits/${derniere.id}/score`)
        .catch(() => null);
      // `mission` et `audit` désignent le même objet : les deux écrans
      // appelants ne l'avaient pas nommé pareil, et renommer l'un des deux
      // toucherait à du code qui marche pour rien.
      return { entreprise, mission: derniere, audit: derniere, score };
    })
  );
}

/**
 * Missions ramenées à la forme que lisent les écrans.
 *
 * Le risque se lit sur les non-conformités constatées, pas sur le score : une
 * mission peu avancée mais déjà porteuse d'un écart critique doit remonter en
 * tête.
 */
export function vueDesMissions(missions) {
  return missions.map(({ entreprise, audit, score, nonConformites }) => {
    const total = score?.nombreCriteresTotal ?? audit.nombreCriteres ?? 0;
    const evalues = score?.nombreCriteresEvalues ?? 0;
    const critiques = nonConformites.filter((nc) => nc.niveau === 'CRITIQUE').length;
    const majeures = nonConformites.filter((nc) => nc.niveau === 'MAJEURE').length;

    let risque = null;
    if (evalues > 0) {
      if (critiques > 0) risque = 'ELEVE';
      else if (majeures > 0) risque = 'MOYEN';
      else risque = 'FAIBLE';
    }

    return {
      id: audit.id,
      entrepriseId: entreprise.id,
      organisation: entreprise.raisonSociale ?? entreprise.nom ?? '—',
      nom: audit.nom,
      progression: total > 0 ? Math.round((evalues / total) * 100) : 0,
      // Le score global est noté sur 5 (RG31) ; la conformité en est la
      // traduction en pourcentage pour la lecture rapide.
      // V74-C3-B11 : sans critère évalué, le 0 du serveur est une absence.
      score: evalues > 0 ? score.scoreGlobal : null,
      noteTotale: score?.noteTotale ?? null,
      coefficientTotal: score?.coefficientTotal ?? null,
      conformite: evalues > 0 ? Math.round((Number(score.scoreGlobal) / 5) * 100) : null,
      risque,
      statut: audit.statut,
      echeance: audit.dateFin ? formaterDate(audit.dateFin) : null,
      lien: `/app/${entreprise.id}/audits/${audit.id}`,
      critiques,
      majeures,
      ecartsOuverts: nonConformites.filter((nc) => nc.statut === 'OUVERTE').length,
      nonEvalues: score?.nombreCriteresNonEvalues ?? Math.max(0, total - evalues),
      evalues,
      total,
      misAJourLe: audit.dateFin ?? audit.dateDebut ?? null,
    };
  });
}

/**
 * Le portefeuille vu organisation par organisation.
 *
 * C'est l'axe de lecture d'un superviseur : il ne pilote pas des missions en
 * vrac, il pilote des organisations dont certaines demandent une intervention.
 *
 * Une organisation sans mission rend `score: null`, jamais zéro — « aucune
 * mission » et « score nul » ne disent pas la même chose, et les confondre est
 * précisément le défaut que l'indice de préparation a dû corriger.
 */
export function parOrganisation(entreprises, missionsVue) {
  return (entreprises ?? []).map((entreprise) => {
    const siennes = missionsVue.filter((m) => m.entrepriseId === entreprise.id);
    const actives = siennes.filter((m) => m.statut !== 'ANNULE');
    const notees = siennes.filter((m) => m.score != null);
    const somme = notees.reduce((t, m) => t + Number(m.score), 0);

    return {
      entreprise,
      missions: actives.length,
      enCours: siennes.filter((m) => m.statut === 'EN_COURS').length,
      // Une mission entièrement évaluée et non close attend une décision :
      // c'est la définition retenue par AuditsListe pour sa vue « à valider ».
      aValider: siennes.filter((m) => m.total > 0 && m.evalues === m.total && m.statut !== 'TERMINE')
        .length,
      score: notees.length > 0 ? somme / notees.length : null,
      critiques: siennes.reduce((t, m) => t + m.critiques, 0),
      ecartsOuverts: siennes.reduce((t, m) => t + m.ecartsOuverts, 0),
      derniereActivite: siennes.reduce(
        (recente, m) => (m.misAJourLe && (!recente || m.misAJourLe > recente) ? m.misAJourLe : recente),
        null
      ),
    };
  });
}

/**
 * Ce qui demande une intervention, en premier.
 *
 * Seuls les vrais signalements sont listés : un écart critique, une mission
 * qui attend une décision. L'ordre suit l'urgence.
 *
 * « Aucune mission ouverte » n'en est pas un. Mesuré sur les données
 * réelles, ce cas remplissait le bloc de huit lignes identiques sur plus de
 * cinq cents pixels, en repoussant hors de vue les organisations qui, elles,
 * appelaient un geste. C'est une information de volume : `sansMission` la
 * rend comme un nombre, que le bloc résume en une ligne.
 *
 * La liste est bornée : au-delà de six, on ne balaie plus, on fait défiler —
 * et le portefeuille complet est à un clic.
 */
export function aTraiterEnPremier(lignes, maximum = 6) {
  const signales = (lignes ?? [])
    .filter((l) => l.critiques > 0 || l.aValider > 0)
    .sort((a, b) => b.critiques - a.critiques || b.aValider - a.aValider);
  return {
    urgentes: signales.slice(0, maximum),
    reste: Math.max(0, signales.length - maximum),
    sansMission: (lignes ?? []).filter((l) => l.missions === 0).length,
  };
}
