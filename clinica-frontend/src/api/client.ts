import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    // Adjunta el mensaje del backend al error para que los catch lo puedan mostrar
    const backendMsg = err.response?.data?.message;
    if (backendMsg) {
      err.message = Array.isArray(backendMsg) ? backendMsg.join(', ') : backendMsg;
    }
    return Promise.reject(err);
  },
);

/** Extrae el mensaje de error de una excepción axios */
export function errorMsg(err: unknown, fallback = 'Error inesperado'): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

// Usuarios (admin)
export const usuariosApi = {
  list: () => api.get('/auth/usuarios').then((r) => r.data),
  create: (data: any) => api.post('/auth/usuarios', data).then((r) => r.data),
  update: (id: number, data: any) => api.patch(`/auth/usuarios/${id}`, data).then((r) => r.data),
};

// Maestros
export const pacientesApi = {
  list: () => api.get('/maestros/pacientes').then((r) => r.data),
  get: (id: number) => api.get(`/maestros/pacientes/${id}`).then((r) => r.data),
  buscarDni: (dni: string) => api.get('/maestros/pacientes/buscar', { params: { dni } }).then((r) => r.data),
  create: (data: any) => api.post('/maestros/pacientes', data).then((r) => r.data),
  update: (id: number, data: any) => api.patch(`/maestros/pacientes/${id}`, data).then((r) => r.data),
};

export const profesionalesApi = {
  list: () => api.get('/maestros/profesionales').then((r) => r.data),
  tipos: () => api.get('/maestros/profesionales/tipos-profesion').then((r) => r.data),
  create: (data: any) => api.post('/maestros/profesionales', data).then((r) => r.data),
  update: (id: number, data: any) => api.patch(`/maestros/profesionales/${id}`, data).then((r) => r.data),
  createTipo: (data: any) => api.post('/maestros/profesionales/tipos-profesion', data).then((r) => r.data),
  updateTipo: (id: number, data: any) => api.patch(`/maestros/profesionales/tipos-profesion/${id}`, data).then((r) => r.data),
};

export const obrasSocialesApi = {
  list: () => api.get('/maestros/obras-sociales').then((r) => r.data),
  create: (data: any) => api.post('/maestros/obras-sociales', data).then((r) => r.data),
  update: (id: number, data: any) => api.patch(`/maestros/obras-sociales/${id}`, data).then((r) => r.data),
};

export const nomencladorApi = {
  search: (q?: string) => api.get('/maestros/nomenclador', { params: { q } }).then((r) => r.data),
  create: (data: any) => api.post('/maestros/nomenclador', data).then((r) => r.data),
};

export const camasApi = {
  list: () => api.get('/maestros/camas').then((r) => r.data),
  disponibles: (sectorId?: number) =>
    api.get('/maestros/camas/disponibles', { params: sectorId ? { sectorId } : {} }).then((r) => r.data),
  sectores: () => api.get('/maestros/camas/sectores').then((r) => r.data),
  create: (data: any) => api.post('/maestros/camas', data).then((r) => r.data),
  updateEstado: (id: number, estado: string) => api.patch(`/maestros/camas/${id}/estado`, { estado }).then((r) => r.data),
  createSector: (data: any) => api.post('/maestros/camas/sectores', data).then((r) => r.data),
  updateSector: (id: number, data: any) => api.patch(`/maestros/camas/sectores/${id}`, data).then((r) => r.data),
};

// Internaciones
export const internacionesApi = {
  list: (activas?: boolean) =>
    api.get('/internaciones', { params: activas !== undefined ? { activas } : {} }).then((r) => r.data),
  get: (id: number) => api.get(`/internaciones/${id}`).then((r) => r.data),
  iniciar: (data: any) => api.post('/internaciones', data).then((r) => r.data),
  darAlta: (id: number, data: any) => api.patch(`/internaciones/${id}/alta`, data).then((r) => r.data),
};

// Prescripciones
export const prescripcionesApi = {
  byInternacion: (id: number) => api.get(`/prescripciones/internacion/${id}`).then((r) => r.data),
  prescribirMedicamento: (data: any) => api.post('/prescripciones/medicamento', data).then((r) => r.data),
  prescribirPractica: (data: any) => api.post('/prescripciones/practica', data).then((r) => r.data),
  prescribirControl: (data: any) => api.post('/prescripciones/control-especial', data).then((r) => r.data),
  autorizar: (id: number, data: any) => api.patch(`/prescripciones/${id}/autorizar`, data).then((r) => r.data),
  suspender: (id: number, data: any) => api.patch(`/prescripciones/${id}/suspender`, data).then((r) => r.data),
};

// Enfermería
export const enfermeriaApi = {
  agendaSuministros: (desde: string, hasta: string) =>
    api.get('/enfermeria/agenda-suministros', { params: { desde, hasta } }).then((r) => r.data),
  historialSuministros: (desde?: string, hasta?: string) =>
    api.get('/enfermeria/historial-suministros', { params: desde && hasta ? { desde, hasta } : {} }).then((r) => r.data),
  cronogramaControles: (desde: string, hasta: string) =>
    api.get('/enfermeria/cronograma-controles', { params: { desde, hasta } }).then((r) => r.data),
  historialControles: (desde?: string, hasta?: string) =>
    api.get('/enfermeria/historial-controles', { params: desde && hasta ? { desde, hasta } : {} }).then((r) => r.data),
  registrarSuministro: (id: number, data: any) =>
    api.patch(`/enfermeria/suministros/${id}/registrar`, data).then((r) => r.data),
  registrarControl: (id: number, data: any) =>
    api.patch(`/enfermeria/controles/${id}/registrar`, data).then((r) => r.data),
};

// Botiquín
export const botiquinApi = {
  pendientes: () => api.get('/botiquin/solicitudes/pendientes').then((r) => r.data),
  historial: (estado?: string, desde?: string, hasta?: string) =>
    api.get('/botiquin/solicitudes', {
      params: {
        ...(estado ? { estado } : {}),
        ...(desde && hasta ? { desde, hasta } : {}),
      },
    }).then((r) => r.data),
  crear: (data: any) => api.post('/botiquin/solicitudes', data).then((r) => r.data),
  registrarEntrega: (id: number, items: any[]) =>
    api.patch(`/botiquin/solicitudes/${id}/entrega`, { items }).then((r) => r.data),
};

// Facturación
export const facturacionApi = {
  list: () => api.get('/facturacion').then((r) => r.data),
  get: (id: number) => api.get(`/facturacion/${id}`).then((r) => r.data),
  crearFactura: (data: any) => api.post('/facturacion/facturas', data).then((r) => r.data),
  registrarLiquidacion: (data: any) => api.post('/facturacion/liquidaciones', data).then((r) => r.data),
  consultaPrestador: (id: number) => api.get(`/facturacion/prestadores/${id}/consulta`).then((r) => r.data),
};
