import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  FileCheck2,
  FileSearch,
  GraduationCap,
  Leaf,
  ListChecks,
  Route,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import EnTeteVitrine from '../components/EnTeteVitrine';
import Revele from '../components/Revele';
import AppelAction from '../components/AppelAction';
import { Badge } from '../components/ui';
import { METIERS, SMARTEX } from '../config/smartex';

const ICONES_METIER = {
  diagnostic: FileSearch,
  'plan-action': Route,
  financements: Leaf,
  accompagnement: GraduationCap,
};

const MODULES = [
  {
    icone: ListChecks,
    titre: 'Questionnaire dynamique',
    texte: 'Le référentiel se compose selon le secteur, la taille et le périmètre déclarés : seuls les critères applicables sont évalués.',
  },
  {
    icone: Bot,
    titre: 'Analyse documentaire IA',
    texte: 'Les preuves déposées sont lues par les agents, qui produisent une probabilité de conformité et un indice de confiance.',
  },
  {
    icone: BarChart3,
    titre: 'Tableau de bord de performance',
    texte: 'Score pondéré par domaine, évolution dans le temps et cartographie des risques attendus.',
  },
  {
    icone: ShieldCheck,
    titre: 'Indice de confiance par critère',
    texte: 'Chaque évaluation IA est livrée avec son indice de confiance, pour que votre équipe sache où porter son attention.',
  },
  {
    icone: FileCheck2,
    titre: 'Rapport et exports',
    texte: 'Rapport d’évaluation imprimable et export CSV des critères, notes et actions correctives.',
  },
  {
    icone: Workflow,
    titre: 'Espace multi-entreprises',
    texte: 'Un même compte pilote plusieurs entités, avec isolation des données et rôles distincts par entreprise.',
  },
];

export default function Services() {
  return (
    <div>
      <EnTeteVitrine
        etiquette="Nos services"
        icone={Briefcase}
        titre="Du diagnostic RSE au dossier de financement vert"
        description={`${SMARTEX.editeur} combine l’expertise d’un cabinet et la plateforme ${SMARTEX.produit} pour objectiver, prioriser et documenter votre performance durable.`}
      />

      <section className="mx-auto max-w-[90rem] px-5 py-20">
        <Revele className="max-w-2xl">
          <Badge ton="bleu" icone={Briefcase}>
            Accompagnement Smartex
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold text-ink-900">Quatre domaines d’intervention</h2>
        </Revele>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {METIERS.map((metier, index) => {
            const Icone = ICONES_METIER[metier.code] ?? Briefcase;
            return (
              <Revele key={metier.code} delai={index * 110}>
                <article className="carte-vitrine group h-full">
                  <span className="puce-icone">
                    <Icone className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink-900">{metier.titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{metier.texte}</p>
                </article>
              </Revele>
            );
          })}
        </div>
      </section>

      <section className="border-y border-ink-100 bg-ink-50 py-20">
        <div className="mx-auto max-w-[90rem] px-5">
          <Revele className="max-w-2xl">
            <Badge ton="violet" icone={Workflow}>
              Modules de la plateforme
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold text-ink-900">Ce que vous utilisez au quotidien</h2>
          </Revele>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((module, index) => (
              <Revele key={module.titre} delai={index * 90}>
                <article className="carte-vitrine group h-full">
                  <span className="puce-icone">
                    <module.icone className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink-900">{module.titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{module.texte}</p>
                </article>
              </Revele>
            ))}
          </div>

          <Revele delai={200} className="mt-10">
            <Link to="/formules" className="btn-vitrine group">
              Voir les formules
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </Revele>
        </div>
      </section>

      <AppelAction
        titre="Un périmètre particulier à évaluer ?"
        texte="Décrivez votre secteur et vos échéances : un expert Smartex vous répond avec la formule et la démarche adaptées."
      />
    </div>
  );
}
