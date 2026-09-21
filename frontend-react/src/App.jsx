import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ApiAuthProvider } from './auth/ApiAuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import { useApiAuth } from './auth/useApiAuth';
import Layout from './components/Layout';
import LayoutPublic from './components/LayoutPublic';
import { Loader } from './components/ui';
import Landing from './pages/Landing';
import Accueil from './pages/Accueil';
import Solution from './pages/Solution';
import Fonctionnalites from './pages/Fonctionnalites';
import Offres from './pages/Offres';
import Services from './pages/Services';
import Formules from './pages/Formules';
import Methodologie from './pages/Methodologie';
import Deploiement from './pages/Deploiement';
import Ressources from './pages/Ressources';
import Formation from './pages/Formation';
import Contact from './pages/Contact';
import MentionsLegales from './pages/MentionsLegales';
import ConnexionReelle from './pages/ConnexionReelle';
import Inscription from './pages/Inscription';
import AccepterInvitation from './pages/AccepterInvitation';
import MotDePasseOublie from './pages/MotDePasseOublie';
import ReinitialiserMotDePasse from './pages/ReinitialiserMotDePasse';
import TableauDeBord from './pages/TableauDeBord';
import Entreprises from './pages/Entreprises';
import EntrepriseDetail from './pages/EntrepriseDetail';
import AuditsListe from './pages/AuditsListe';
import AuditDetail from './pages/AuditDetail';
import AuditScore from './pages/AuditScore';
import NonConformites from './pages/NonConformites';
import NonConformitesEntreprise from './pages/NonConformitesEntreprise';
import Rapports from './pages/Rapports';
import RapportsEntreprise from './pages/RapportsEntreprise';
import FinancementsVerts from './pages/FinancementsVerts';
import PipelineIA from './pages/PipelineIA';
import ComparaisonEntreprises from './pages/ComparaisonEntreprises';
import Classement from './pages/Classement';
import Projets from './pages/Projets';
import ProjetDetail from './pages/ProjetDetail';
import ReferentielsListe from './pages/ReferentielsListe';
import ReferentielDetail from './pages/ReferentielDetail';
import ImportReferentiel from './pages/ImportReferentiel';
import IndicePreparation from './pages/IndicePreparation';
import PageIntrouvable from './pages/PageIntrouvable';
import CritereEvaluation from './pages/CritereEvaluation';
import Documents from './pages/Documents';
import Questionnaire from './pages/Questionnaire';
import Abonnement from './pages/Abonnement';
import Utilisateurs from './pages/Utilisateurs';
import UtilisateursPlateforme from './pages/UtilisateursPlateforme';
import Journal from './pages/Journal';
import PlanActions from './pages/PlanActions';
import PlansAmelioration from './pages/PlansAmelioration';
import MesActions from './pages/MesActions';
import PlanAmeliorationDetail from './pages/PlanAmeliorationDetail';
import Profil from './pages/Profil';

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
            {/* La racine porte la page d'entrée et son décor sombre. Elle
                garde son design propre : ni palette ni typographie de la
                charte SustWay, et ni pied de page ni bandeau (voir
                LayoutPublic). C'est le logo de l'en-tête qui y ramène. */}
            <Route path="/" element={<Landing />} />
            {/* Les cinq pages de la charte SMARTEX SustWay. Elles partagent
                l'enveloppe `sustway` (voir LayoutPublic), qui porte leur
                palette et leur typographie. */}
            <Route path="/accueil" element={<Accueil />} />
            <Route path="/solution" element={<Solution />} />
            <Route path="/fonctionnalites" element={<Fonctionnalites />} />
            <Route path="/offres" element={<Offres />} />
            {/* Pages retirées de la vitrine recentrée sur la solution : leurs
                adresses redirigent, pour qu'aucun lien déjà partagé ne casse. */}
            <Route path="/services" element={<Services />} />
            <Route path="/formules" element={<Formules />} />
            <Route path="/a-propos" element={<Navigate to="/services#smartex" replace />} />
            <Route path="/methodologie" element={<Methodologie />} />
            <Route path="/avantages" element={<Navigate to="/services" replace />} />
            <Route path="/engagement" element={<Navigate to="/formules" replace />} />
            <Route path="/deploiement" element={<Deploiement />} />
            <Route path="/ressources" element={<Ressources />} />
            <Route path="/formation" element={<Formation />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<Navigate to="/methodologie#questions" replace />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
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
