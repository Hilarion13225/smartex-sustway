import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ApiAuthProvider } from './auth/ApiAuthContext';
import { useApiAuth } from './auth/useApiAuth';
import Layout from './components/Layout';
import LayoutPublic from './components/LayoutPublic';
import { Loader } from './components/ui';
import Accueil from './pages/Accueil';
import Services from './pages/Services';
import Formules from './pages/Formules';
import APropos from './pages/APropos';
import Contact from './pages/Contact';
import Faq from './pages/Faq';
import MentionsLegales from './pages/MentionsLegales';
import ConnexionReelle from './pages/ConnexionReelle';
import Inscription from './pages/Inscription';
import VerificationEmail from './pages/VerificationEmail';
import TableauDeBord from './pages/TableauDeBord';
import Entreprises from './pages/Entreprises';
import EntrepriseDetail from './pages/EntrepriseDetail';
import AuditsListe from './pages/AuditsListe';
import AuditDetail from './pages/AuditDetail';
import AuditScore from './pages/AuditScore';
import NonConformites from './pages/NonConformites';
import Rapports from './pages/Rapports';
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
import RevueExperteQueue from './pages/RevueExperteQueue';
import Profil from './pages/Profil';

function RouteProtegee() {
  const { estConnecte, chargement } = useApiAuth();
  if (chargement) return <Loader message="Chargement…" />;
  if (!estConnecte) return <Navigate to="/connexion" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <ApiAuthProvider>
      <Router>
        <Routes>
          <Route element={<LayoutPublic />}>
            <Route path="/" element={<Accueil />} />
            <Route path="/services" element={<Services />} />
            <Route path="/formules" element={<Formules />} />
            <Route path="/a-propos" element={<APropos />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
          </Route>
          <Route path="/connexion" element={<ConnexionReelle />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/verification-email" element={<VerificationEmail />} />
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
              <Route path=":entrepriseId/audits" element={<AuditsListe />} />
              <Route path=":entrepriseId/audits/:auditId" element={<AuditDetail />} />
              <Route path=":entrepriseId/audits/:auditId/score" element={<AuditScore />} />
              <Route path=":entrepriseId/audits/:auditId/non-conformites" element={<NonConformites />} />
              <Route path=":entrepriseId/audits/:auditId/rapports" element={<Rapports />} />
              <Route path=":entrepriseId/audits/:auditId/indice-preparation" element={<IndicePreparation />} />
              <Route path=":entrepriseId/audits/:auditId/criteres/:auditCritereId" element={<CritereEvaluation />} />
              <Route path=":entrepriseId/revues-expertes" element={<RevueExperteQueue />} />
              <Route path="profil" element={<Profil />} />
              <Route path="referentiels" element={<ReferentielsListe />} />
              <Route path="referentiels/:code" element={<ReferentielDetail />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ApiAuthProvider>
  );
}
