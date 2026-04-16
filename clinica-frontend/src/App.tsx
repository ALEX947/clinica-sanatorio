import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import HomePage from './pages/HomePage';
import InternacionesPage from './pages/internaciones/InternacionesPage';
import InternacionDetallePage from './pages/internaciones/InternacionDetallePage';
import NuevaInternacionPage from './pages/internaciones/NuevaInternacionPage';
import PacientesPage from './pages/maestros/PacientesPage';
import ProfesionalesPage from './pages/maestros/ProfesionalesPage';
import ObrasSocialesPage from './pages/maestros/ObrasSocialesPage';
import NomencladorPage from './pages/maestros/NomencladorPage';
import CamasPage from './pages/maestros/CamasPage';
import SectoresPage from './pages/maestros/SectoresPage';
import TiposProfesionPage from './pages/maestros/TiposProfesionPage';
import UsuariosPage from './pages/usuarios/UsuariosPage';
import EnfermeriaPage from './pages/enfermeria/EnfermeriaPage';
import PrescripcionesPage from './pages/prescripciones/PrescripcionesPage';
import BotiquinPage from './pages/botiquin/BotiquinPage';
import FacturacionPage from './pages/facturacion/FacturacionPage';

dayjs.locale('es');

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();
  if (loading) return <Spin fullscreen />;
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />

        {/* Internaciones */}
        <Route path="internaciones" element={<InternacionesPage />} />
        <Route path="internaciones/nueva" element={<NuevaInternacionPage />} />
        <Route path="internaciones/:id" element={<InternacionDetallePage />} />

        {/* Prescripciones */}
        <Route path="prescripciones" element={<PrescripcionesPage />} />

        {/* Enfermería */}
        <Route path="enfermeria" element={<EnfermeriaPage />} />

        {/* Botiquín */}
        <Route path="botiquin" element={<BotiquinPage />} />

        {/* Facturación */}
        <Route path="facturacion" element={<FacturacionPage />} />

        {/* Maestros */}
        <Route path="maestros/pacientes" element={<PacientesPage />} />
        <Route path="maestros/profesionales" element={<ProfesionalesPage />} />
        <Route path="maestros/obras-sociales" element={<ObrasSocialesPage />} />
        <Route path="maestros/nomenclador" element={<NomencladorPage />} />
        <Route path="maestros/camas" element={<CamasPage />} />
        <Route path="maestros/sectores" element={<SectoresPage />} />
        <Route path="maestros/tipos-profesion" element={<TiposProfesionPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider locale={esES} theme={{ token: { colorPrimary: '#1890ff' } }}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
