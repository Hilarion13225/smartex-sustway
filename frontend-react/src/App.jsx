import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ApiAuthProvider } from './auth/ApiAuthContext';
import { useApiAuth } from './auth/useApiAuth';
import Layout from './components/Layout';
import { Loader } from './components/ui';
import Accueil from './pages/Accueil';
import ConnexionReelle from './pages/ConnexionReelle';
import Inscription from './pages/Inscription';
import Entreprises from './pages/Entreprises';
import EntrepriseDetail from './pages/EntrepriseDetail';
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
          <Route path="/" element={<Accueil />} />
          <Route path="/connexion" element={<ConnexionReelle />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route element={<RouteProtegee />}>
            <Route path="/app" element={<Layout />}>
              <Route index element={<Entreprises />} />
              <Route path=":entrepriseId" element={<EntrepriseDetail />} />
              <Route path="profil" element={<Profil />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ApiAuthProvider>
  );
}
