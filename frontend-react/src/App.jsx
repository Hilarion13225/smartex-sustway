import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ApiAuthProvider } from './auth/ApiAuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import { useApiAuth } from './auth/useApiAuth';
import Layout from './components/Layout';
import LayoutPublic from './components/LayoutPublic';
import { Loader } from './components/ui';

// Vitrine : chargement immediat (premier ecran visible).
import Accueil from './pages/Accueil';
import Solution from './pages/Solution';
import Fonctionnalites from './pages/Fonctionnalites';
import Offres from './pages/Offres';
import Ressources from './pages/Ressources';
import Contact from './pages/Contact';

// Auth : chargement immediat (parcours critique).
import ConnexionReelle from './pages/ConnexionReelle';
import Inscription from './pages/Inscription';
import AccepterInvitation from './pages/AccepterInvitation';
import MotDePasseOublie from './pages/MotDePasseOublie';
import ReinitialiserMotDePasse from './pages/ReinitialiserMotDePasse';

// Espace connecte : lazy-loaded apres authentification.
const TableauDeBord = lazy(() => import('./pages/TableauDeBord'));
const Entreprises = lazy(() => import('./pages/Entreprises'));
const EntrepriseDetail = lazy(() => import('./pages/EntrepriseDetail'));
const AuditsListe = lazy(() => import('./pages/AuditsListe'));
const AuditDetail = lazy(() => import('./pages/AuditDetail'));
const AuditScore = lazy(() => import('./pages/AuditScore'));
const NonConformites = lazy(() => import('./pages/NonConformites'));
const NonConformitesEntreprise = lazy(() => import('./pages/NonConformitesEntreprise'));
const Rapports = lazy(() => import('./pages/Rapports'));
const RapportsEntreprise = lazy(() => import('./pages/RapportsEntreprise'));
const FinancementsVerts = lazy(() => import('./pages/FinancementsVerts'));
const PipelineIA = lazy(() => import('./pages/PipelineIA'));
const ComparaisonEntreprises = lazy(() => import('./pages/ComparaisonEntreprises'));
const Classement = lazy(() => import('./pages/Classement'));
const Projets = lazy(() => import('./pages/Projets'));
const ProjetDetail = lazy(() => import('./pages/ProjetDetail'));
const ReferentielsListe = lazy(() => import('./pages/ReferentielsListe'));
const ReferentielDetail = lazy(() => import('./pages/ReferentielDetail'));
const ImportReferentiel = lazy(() => import('./pages/ImportReferentiel'));
const IndicePreparation = lazy(() => import('./pages/IndicePreparation'));
const PageIntrouvable = lazy(() => import('./pages/PageIntrouvable'));
const CritereEvaluation = lazy(() => import('./pages/CritereEvaluation'));
const Documents = lazy(() => import('./pages/Documents'));
const Questionnaire = lazy(() => import('./pages/Questionnaire'));
const Abonnement = lazy(() => import('./pages/Abonnement'));
const Utilisateurs = lazy(() => import('./pages/Utilisateurs'));
const UtilisateursPlateforme = lazy(() => import('./pages/UtilisateursPlateforme'));
const Journal = lazy(() => import('./pages/Journal'));
const PlanActions = lazy(() => import('./pages/PlanActions'));
const PlansAmelioration = lazy(() => import('./pages/PlansAmelioration'));
const MesActions = lazy(() => import('./pages/MesActions'));
const PlanAmeliorationDetail = lazy(() => import('./pages/PlanAmeliorationDetail'));
const Profil = lazy(() => import('./pages/Profil'));

function RouteProtegee() {
  const { estConnecte, chargement } = useApiAuth();
  if (chargement) return <Loader message="Chargement…" />;
  if (!estConnecte) return <Navigate to="/connexion" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <ThemeProvider>
    <ApiAuthProvider>
      <Router>
        <Routes>
          <Route element={<LayoutPublic />}>
            {/* Les cinq pages de la charte SMARTEX SustWay. Elles partagent
                l'enveloppe `sustway` (voir LayoutPublic), qui porte leur
                palette et leur typographie. L'accueil est à la racine : c'est
                lui que le logotype de l'en-tête ramène. */}
            <Route path="/" element={<Accueil />} />
            <Route path="/solution" element={<Solution />} />
            <Route path="/fonctionnalites" element={<Fonctionnalites />} />
            <Route path="/offres" element={<Offres />} />
            {/* Pages retirées de la vitrine recentrée sur la solution : leurs
                adresses redirigent, pour qu'aucun lien déjà partagé ne casse.
                `/accueil` en fait désormais partie : la page a rejoint la
                racine. */}
            <Route path="/accueil" element={<Navigate to="/" replace />} />
            {/* La page Services a ete supprimee. Elle etait l'ancienne page
                d'accueil, et les cinq pages de la charte couvrent son propos ;
                ses anciens liens menent donc a la Solution. */}
            <Route path="/services" element={<Navigate to="/solution" replace />} />
            <Route path="/a-propos" element={<Navigate to="/solution" replace />} />
            {/* La page Methodologie a ete supprimee. La demarche en cinq etapes
                qu'elle exposait vit desormais dans la section « Methodologie »
                de la page Solution, ou ses anciens liens aboutissent. */}
            <Route path="/methodologie" element={<Navigate to="/solution#methodologie" replace />} />
            <Route path="/avantages" element={<Navigate to="/solution" replace />} />
            <Route path="/engagement" element={<Navigate to="/offres" replace />} />
            {/* La page Formules a ete supprimee : ses anciens liens menent aux offres,
                qui portent desormais les trois niveaux de service. */}
            <Route path="/formules" element={<Navigate to="/offres" replace />} />
            {/* La page Deploiement a ete supprimee. Les etapes de mission qu'elle
                detaillait rejoignent la demarche en cinq etapes de la page
                Solution, ou ses anciens liens aboutissent. */}
            <Route path="/deploiement" element={<Navigate to="/solution#methodologie" replace />} />
            <Route path="/ressources" element={<Ressources />} />
            {/* La page Formation a ete supprimee. Aucune autre page ne decrit
                l'offre de formation : ses anciens liens menent au contact,
                seul endroit ou la demander. */}
            <Route path="/formation" element={<Navigate to="/contact" replace />} />
            <Route path="/contact" element={<Contact />} />
            {/* La page Methodologie ne portait aucune FAQ : l'ancre #questions
                qu'on visait ici n'existait pas. La rubrique FAQ de la page
                Ressources dit franchement qu'elle est en preparation. */}
            <Route path="/faq" element={<Navigate to="/ressources#faq" replace />} />
            {/* La page des mentions legales a ete supprimee sur demande. Ses
                anciens liens menent a l'accueil, faute de page equivalente.
                A remettre si le site doit publier ses mentions et sa
                politique de confidentialite. */}
            <Route path="/mentions-legales" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="/connexion" element={<ConnexionReelle />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/invitation/:token" element={<AccepterInvitation />} />
          <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
          <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
          <Route element={<RouteProtegee />}>
            <Route path="/app" element={<Layout />}>
              <Route index element={<TableauDeBord />} />
              <Route path="entreprises" element={<Entreprises />} />
              {/* Vue plateforme, distincte de `:entrepriseId/utilisateurs` qui
                  gère les membres d'une organisation : celle-ci recense, celle-là
                  administre. Pas de doublon, deux portées. */}
              <Route path="utilisateurs" element={<UtilisateursPlateforme />} />
              <Route path=":entrepriseId" element={<EntrepriseDetail />} />
              <Route path=":entrepriseId/documents" element={<Documents />} />
              <Route path=":entrepriseId/questionnaire" element={<Questionnaire />} />
              <Route path=":entrepriseId/abonnement" element={<Abonnement />} />
              <Route path=":entrepriseId/utilisateurs" element={<Utilisateurs />} />
              <Route path=":entrepriseId/journal" element={<Journal />} />
              {/* Actions correctives : issues des non-conformités. Distinctes
                  des plans d'amélioration ci-dessous, construits à partir des
                  axes validés. */}
              <Route path=":entrepriseId/plan-actions" element={<PlanActions />} />
              <Route path=":entrepriseId/plans" element={<PlansAmelioration />} />
              <Route path=":entrepriseId/mes-actions" element={<MesActions />} />
              <Route
                path=":entrepriseId/audits/:auditId/plans/:planId"
                element={<PlanAmeliorationDetail />}
              />
              <Route path=":entrepriseId/non-conformites" element={<NonConformitesEntreprise />} />
              <Route path=":entrepriseId/rapports" element={<RapportsEntreprise />} />
              <Route path=":entrepriseId/financements-verts" element={<FinancementsVerts />} />
              <Route path=":entrepriseId/pipeline-ia" element={<PipelineIA />} />
              <Route path=":entrepriseId/audits" element={<AuditsListe />} />
              <Route path=":entrepriseId/audits/:auditId" element={<AuditDetail />} />
              <Route path=":entrepriseId/audits/:auditId/score" element={<AuditScore />} />
              <Route path=":entrepriseId/audits/:auditId/non-conformites" element={<NonConformites />} />
              <Route path=":entrepriseId/audits/:auditId/rapports" element={<Rapports />} />
              <Route path=":entrepriseId/audits/:auditId/indice-preparation" element={<IndicePreparation />} />
              <Route path=":entrepriseId/audits/:auditId/criteres/:auditCritereId" element={<CritereEvaluation />} />
              <Route path="profil" element={<Profil />} />
              <Route path="comparaison" element={<ComparaisonEntreprises />} />
              <Route path="classement" element={<Classement />} />
              <Route path="projets" element={<Projets />} />
              <Route path="projets/:projetId" element={<ProjetDetail />} />
              <Route path="referentiels" element={<ReferentielsListe />} />
              {/* Avant la route par code : sinon « import » serait lu comme
                  le code d'un référentiel, et l'assistant inatteignable. */}
              <Route path="referentiels/import" element={<ImportReferentiel />} />
              <Route path="referentiels/import/:importId" element={<ImportReferentiel />} />
              <Route path="referentiels/:code" element={<ReferentielDetail />} />
              {/* Une adresse inconnue sous /app reste dans l'espace de travail :
                  la renvoyer à la vitrine faisait croire à une déconnexion. */}
              <Route path="*" element={<PageIntrouvable />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ApiAuthProvider>
    </ThemeProvider>
  );
}
