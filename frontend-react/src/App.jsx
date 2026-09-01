import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ApiAuthProvider } from './auth/ApiAuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import { useApiAuth } from './auth/useApiAuth';
import Layout from './components/Layout';
import LayoutPublic from './components/LayoutPublic';
import { Loader } from './components/ui';
import Landing from './pages/Landing';
import Accueil from './pages/Accueil';
import Services from './pages/Services';
import Formules from './pages/Formules';
import APropos from './pages/APropos';
import Methodologie from './pages/Methodologie';
import Formation from './pages/Formation';
import Contact from './pages/Contact';
import Faq from './pages/Faq';
import MentionsLegales from './pages/MentionsLegales';
import ConnexionReelle from './pages/ConnexionReelle';
import Inscription from './pages/Inscription';
import VerificationEmail from './pages/VerificationEmail';
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
import ReferentielsListe from './pages/ReferentielsListe';
import ReferentielDetail from './pages/ReferentielDetail';
import IndicePreparation from './pages/IndicePreparation';
import CritereEvaluation from './pages/CritereEvaluation';
import Documents from './pages/Documents';
import Questionnaire from './pages/Questionnaire';
import Abonnement from './pages/Abonnement';
import Utilisateurs from './pages/Utilisateurs';
import Journal from './pages/Journal';
import PlanActions from './pages/PlanActions';
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
          <Route path="/" element={<Landing />} />
          <Route element={<LayoutPublic />}>
            <Route path="/accueil" element={<Accueil />} />
            <Route path="/services" element={<Services />} />
            <Route path="/formules" element={<Formules />} />
            <Route path="/a-propos" element={<APropos />} />
            <Route path="/methodologie" element={<Methodologie />} />
            <Route path="/formation" element={<Formation />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
          </Route>
          <Route path="/connexion" element={<ConnexionReelle />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/verification-email" element={<VerificationEmail />} />
          <Route path="/invitation/:token" element={<AccepterInvitation />} />
          <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
          <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
          <Route element={<RouteProtegee />}>
            <Route path="/app" element={<Layout />}>
              <Route index element={<TableauDeBord />} />
              <Route path="entreprises" element={<Entreprises />} />
              <Route path=":entrepriseId" element={<EntrepriseDetail />} />
              <Route path=":entrepriseId/documents" element={<Documents />} />
              <Route path=":entrepriseId/questionnaire" element={<Questionnaire />} />
              <Route path=":entrepriseId/abonnement" element={<Abonnement />} />
              <Route path=":entrepriseId/utilisateurs" element={<Utilisateurs />} />
              <Route path=":entrepriseId/journal" element={<Journal />} />
              <Route path=":entrepriseId/plan-actions" element={<PlanActions />} />
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
              <Route path="referentiels" element={<ReferentielsListe />} />
              <Route path="referentiels/:code" element={<ReferentielDetail />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ApiAuthProvider>
    </ThemeProvider>
  );
}
