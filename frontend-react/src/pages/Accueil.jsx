import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Bot, Gauge, Leaf, LineChart, Lock, ShieldCheck, Target } from 'lucide-react';
import { useApiAuth } from '../auth/useApiAuth';
import { formaterMontant } from '../lib/export';
import { Badge } from '../components/ui';
import logoSmartexSustway from '../assets/brand/logo-smartex-sustway.png';

const ATOUTS = [
  {
    icone: Bot,
    titre: 'Pipeline IA multi-agents',
    texte:
      'Sept agents analysent les preuves déposées et estiment une probabilité de conformité par critère, plutôt qu’une note saisie à la main.',
  },
  {
    icone: Target,
    titre: 'Priorisation par le risque',
    texte: 'Le risque attendu croise la non-conformité probable et la criticité du critère, variable selon le secteur d’activité.',
  },
  {
    icone: ShieldCheck,
    titre: 'Revue experte ciblée',
    texte: 'En formule Avancées, tout critère évalué avec une confiance IA inférieure à 80 % part en file de revue humaine.',
  },
  {
    icone: Leaf,
    titre: 'Financements verts IFC/SFI',
    texte:
      'Un indice de préparation mesure l’alignement aux 8 Performance Standards du bailleur pilote — une mesure d’alignement, pas une garantie d’éligibilité.',
  },
];

/** Chiffres factuels du CDC (référentiel, agents) — pas des données de démonstration. */
const CHIFFRES = [
  { libelle: 'Critères du référentiel', valeur: '87' },
  { libelle: 'Domaines évalués', valeur: '6' },
  { libelle: 'Agents IA', valeur: '7' },
];

export default function Accueil() {
  const navigate = useNavigate();
  const { listerFormules } = useApiAuth();
  const [formules, setFormules] = useState([]);

  useEffect(() => {
    listerFormules()
      .then(setFormules)
      .catch(() => setFormules([]));
  }, [listerFormules]);

  return (
    <div className="min-h-full bg-white">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-2">
            <img src={logoSmartexSustway} alt="Smartex Sustway" className="h-9 w-auto" />
            <div>
              <p className="text-sm font-semibold leading-tight">Smartex Sustway</p>
              <p className="text-xs text-ink-500">Méthodologie Smartex Expertises</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <a href="#formules" className="btn-ghost hidden sm:inline-flex">
              Formules
            </a>
            <Link to="/connexion" className="btn-secondary">
              Se connecter
            </Link>
            <Link to="/inscription" className="btn-primary">
              Créer un compte
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge ton="vert" icone={BadgeCheck}>
              Version 1.5 — volet financements verts intégré
            </Badge>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
              L’évaluation RSE, de la collecte de preuves au rapport, pilotée par l’intelligence artificielle.
            </h1>
            <p className="mt-4 max-w-xl text-base text-ink-600">
              Smartex Sustway digitalise le cycle d’audit RSE : composition dynamique du questionnaire, analyse
              documentaire automatisée, probabilité de conformité par critère, priorisation des actions correctives et
              indice de préparation aux financements verts.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/inscription" className="btn-primary">
                Choisir une formule
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/connexion" className="btn-secondary">
                Se connecter
              </Link>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4">
              {CHIFFRES.map((stat) => (
                <div key={stat.libelle} className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                  <dt className="text-xs uppercase tracking-wide text-ink-500">{stat.libelle}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-brand-700">{stat.valeur}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Gauge className="h-4 w-4 text-brand-600" aria-hidden />
              Aperçu du moteur de scoring unifié
            </div>
            <ol className="mt-5 space-y-4">
              {[
                {
                  titre: 'Étape 1 — Probabilité de conformité',
                  texte:
                    'Le pipeline IA calcule une probabilité entre 0 et 100 %, convertie en niveau d’engagement de 1 à 5 sur l’échelle de Likert Smartex.',
                  icone: Bot,
                },
                {
                  titre: 'Étape 2 — Score pondéré Smartex',
                  texte: 'Note obtenue = niveau × coefficient (1 à 3). Score = Σ notes obtenues / Σ coefficients, sur les seuls critères actifs.',
                  icone: LineChart,
                },
                {
                  titre: 'Étape 3 — Risque attendu et priorité',
                  texte: 'Risque = (1 − probabilité) × poids de criticité. La criticité ne participe jamais au score, seulement à la priorité.',
                  icone: Target,
                },
                {
                  titre: 'Étape complémentaire — Indice bailleur',
                  texte: 'Même formule, restreinte aux critères tagués IFC/SFI. Réservée à la formule Avancées.',
                  icone: Leaf,
                },
              ].map((etape) => (
                <li key={etape.titre} className="flex gap-3">
                  <span className="mt-0.5 h-fit rounded-lg bg-brand-50 p-2 text-brand-600">
                    <etape.icone className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{etape.titre}</p>
                    <p className="mt-0.5 text-sm text-ink-500">{etape.texte}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-y border-ink-100 bg-ink-50 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-semibold">Ce que la plateforme apporte</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ATOUTS.map((atout) => (
              <article key={atout.titre} className="card p-5">
                <span className="inline-flex rounded-lg bg-brand-50 p-2.5 text-brand-600">
                  <atout.icone className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-3 text-sm font-semibold">{atout.titre}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{atout.texte}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="formules" className="mx-auto max-w-6xl px-5 py-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold">Choisissez votre formule avant l’inscription</h2>
          <p className="mt-2 text-sm text-ink-600">
            Le choix de la formule est transmis lors de la création du compte et active immédiatement les fonctionnalités
            correspondantes (RG24). La formule Free est un mode de démonstration : aucune création d’entreprise n’est
            possible avec elle (RG25).
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {formules.map((formule) => {
            const misEnAvant = formule.code === 'AVANCEES';
            const gratuit = Number(formule.prixMensuel) === 0;
            return (
              <article key={formule.code} className={`card flex flex-col p-6 ${misEnAvant ? 'ring-2 ring-brand-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{formule.nom}</h3>
                  {misEnAvant ? <Badge ton="vert">Recommandée</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-ink-500">{formule.description}</p>
                <p className="mt-4 text-3xl font-semibold text-ink-900">
                  {gratuit ? 'Gratuit' : formaterMontant(formule.prixMensuel)}
                  {!gratuit ? <span className="text-sm font-normal text-ink-500"> / mois</span> : null}
                </p>
                {!gratuit ? (
                  <p className="text-xs text-ink-500">ou {formaterMontant(formule.prixAnnuel)} en facturation annuelle</p>
                ) : (
                  <p className="text-xs text-ink-500">Consultation en mode démonstration uniquement</p>
                )}
                <div className="mt-5 flex-1" />
                <button
                  type="button"
                  className={misEnAvant ? 'btn-primary mt-6' : 'btn-secondary mt-6'}
                  onClick={() => navigate(`/inscription?formule=${formule.code}`)}
                >
                  Choisir {formule.nom}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </article>
            );
          })}
        </div>

        <p className="mt-6 flex items-center gap-2 text-xs text-ink-500">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Paiement des formules Standard et Avancées via PI-SPI et Wave, en facturation mensuelle ou annuelle au choix.
        </p>
      </section>

      <footer className="border-t border-ink-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-xs text-ink-500">
          <p>Smartex Sustway — plateforme connectée à l’API réelle (phases A à C).</p>
          <p>Chiffrement au repos et en transit, isolation multi-tenant, conformité RGPD.</p>
        </div>
      </footer>
    </div>
  );
}
