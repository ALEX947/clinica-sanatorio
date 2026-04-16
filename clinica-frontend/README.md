# Sistema de Administración de Clínica/Sanatorio — Frontend

Interfaz web para el sistema de gestión de una clínica privada.
Consume la API REST del backend y presenta vistas diferenciadas por rol de usuario.

## Stack

- **Framework:** React 18 + TypeScript
- **Build tool:** Vite 5
- **UI:** Ant Design 5
- **Routing:** React Router v6
- **HTTP:** Axios

## Requisitos previos

- Node.js 20 o superior
- Backend corriendo en `http://localhost:3000` (ver `clinica-backend/`)

## Instalación

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

> Asegurate de tener el backend iniciado antes de usar la aplicación.

## Build para producción

```bash
npm run build
```

Los archivos estáticos se generan en `dist/`. Servir con cualquier servidor web estático (nginx, serve, etc.).

## Variables de entorno

Crear un archivo `.env.local` para apuntar a otro backend:

```
VITE_API_URL=http://localhost:3000
```

## Roles y vistas

| Rol             | Acceso principal |
|-----------------|-----------------|
| Administrador   | Configuración, usuarios, maestros |
| Mesa de Entradas| Internaciones, autorizaciones, altas |
| Médico          | Prescripciones, agenda clínica |
| Enfermería      | Agenda de suministros y controles, historial |
| Botiquín        | Cola de trabajo, historial con filtros |
| Facturación     | Facturas, liquidaciones de OS |

## Páginas

### Botiquín (`/botiquin`)

Roles: `admin`, `enfermeria`, `botiquin`.

La página tiene dos pestañas:

- **Cola de trabajo** — muestra todas las solicitudes en estado `PENDIENTE` o `PARCIAL` (requieren acción). El rol `botiquin` puede registrar entregas, indicando la cantidad a entregar por ítem. La entrega puede ser parcial; la solicitud quedará `PARCIAL` hasta que todos los ítems estén completos.
- **Historial** — carga manual (botón "Consultar"). Permite filtrar por estado (`pendiente`, `parcial`, `entregada`) y/o rango de fechas con selector de rango. Los ítems muestran cantidades solicitadas, entregadas (con porcentaje) y devueltas.

El rol `enfermeria` puede crear nuevas solicitudes seleccionando una internación activa y agregando ítems de medicamentos prescriptos.

### Enfermería (`/enfermeria`)

Roles: `admin`, `medico`, `enfermeria`.

La página tiene dos tarjetas:

- **Agenda** — requiere seleccionar un rango de fechas obligatorio. Muestra dos pestañas:
  - *Suministros de medicamentos*: dosis planificadas en el período, con estado (`PENDIENTE`, `SUMINISTRADO`, `OMITIDO`). El rol `enfermeria` puede registrar suministros directamente desde la tabla.
  - *Controles especiales*: controles programados (temperatura, glucemia, etc.) en el período. El rol `enfermeria` puede registrar el resultado.
- **Historial** — carga manual (botón "Consultar"). Rango de fechas opcional. Muestra los mismos suministros y controles pero en todos sus estados históricos, incluyendo quién registró cada acción y observaciones.

### Otras páginas

| Página | Ruta | Descripción |
|--------|------|-------------|
| Internaciones | `/internaciones` | Admisión, alta y detalle de pacientes internados |
| Prescripciones | `/prescripciones` | Prescripción de medicamentos, prácticas y controles por internación |
| Facturación | `/facturacion` | Emisión de facturas y liquidaciones a Obras Sociales |
| Mesa de Entradas | `/mesa-entradas` | Autorizaciones y gestión de altas administrativas |
| Maestros | `/maestros` | Pacientes, profesionales, obras sociales, camas, nomenclador |
| Usuarios | `/usuarios` | ABM de cuentas de usuario (solo `admin`) |
