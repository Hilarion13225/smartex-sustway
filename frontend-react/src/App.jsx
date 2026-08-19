import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import { ApiAuthProvider } from './auth/ApiAuthContext';
import Layout from './components/Layout';
import Accueil from './pages/Accueil';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import ConnexionReelle from './pages/ConnexionReelle';
import EspaceReel from './pages/EspaceReel';
import Dashboard from './pages/Dashboard';
import Entreprises from './pages/Entreprises';
import Audits from './pages/Audits';
import AuditDetail from './pages/AuditDetail';
import Preuves from './pages/Preuves';
import Pipeline from './pages/Pipeline';
import RevueExperte from './pages/RevueExperte';
import NonConformites from './pages/NonConformites';
import Actions from './pages/Actions';
import BackOffice from './pages/BackOffice';
import Utilisateurs from './pages/Utilisateurs';
import Abonnement from './pages/Abonnement';
import Journal from './pages/Journal';
import Rapports from './pages/Rapports';
import Comparaison from './pages/Comparaison';
import FinancementsVerts from './pages/FinancementsVerts';
function RouteProtegee() {
  const {
    utilisateur
  } = useAuth();
  if (!utilisateur) return <Navigate to="/connexion" replace />;
  return <Outlet />;
}
export default function App() {
  return <AuthProvider>
      <ApiAuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/connexion-reelle" element={<ConnexionReelle />} />
          <Route path="/reel" element={<EspaceReel />} />
          <Route element={<RouteProtegee />}>
            <Route path="/app" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="entreprises" element={<Entreprises />} />
              <Route path="audits" element={<Audits />} />
              <Route path="audits/:auditId" element={<AuditDetail />} />
              <Route path="preuves" element={<Preuves />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="revue-experte" element={<RevueExperte />} />
              <Route path="non-conformites" element={<NonConformites />} />
              <Route path="actions" element={<Actions />} />
              <Route path="back-office" element={<BackOffice />} />
              <Route path="utilisateurs" element={<Utilisateurs />} />
              <Route path="abonnement" element={<Abonnement />} />
              <Route path="journal" element={<Journal />} />
              <Route path="rapports" element={<Rapports />} />
              <Route path="comparaison" element={<Comparaison />} />
              <Route path="financements-verts" element={<FinancementsVerts />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </ApiAuthProvider>
    </AuthProvider>;
}
