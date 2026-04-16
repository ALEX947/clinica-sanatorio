# Sistema de Administración Clínica/Sanatorio

Sistema de administración para clínica privada desarrollado con NestJS + PostgreSQL + React.

## Stack

- **Backend**: Node.js 20 + NestJS 11 + TypeORM
- **Frontend**: React 18 + TypeScript + Ant Design 5 + Vite
- **Base de datos**: PostgreSQL 16
- **Orquestación**: Docker Compose

## Requisitos

- [Docker Desktop](https://docs.docker.com/desktop/install/windows-install/) (incluye Docker Engine y Docker Compose)
- Node.js 20+
- npm

> Si tenés PostgreSQL instalado localmente en el puerto 5432, el Docker expone la base en el **5433** para evitar conflictos.

---

## Levantar el entorno

### Modo desarrollo (recomendado)

Solo levantás la base de datos en Docker y corrés backend/frontend en local con hot-reload:

```bash
# 1. Levantar PostgreSQL
docker compose up -d postgres

# 2. Backend (en clinica-backend/)
cd clinica-backend
npm install
npm run start:dev

# 3. Frontend (en clinica-frontend/)
cd clinica-frontend
npm install
npm run dev
```

### Modo completo (todo en Docker)

```bash
docker compose up -d
```

Levanta los tres servicios: PostgreSQL, backend y frontend.

---

## URLs

| Servicio  | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:5173         |
| Backend   | http://localhost:3000         |
| Swagger   | http://localhost:3000/api/docs|

---

## Poblar la base de datos

Una vez que el contenedor de PostgreSQL está corriendo, ejecutar desde `clinica-backend/`:

```bash
cd clinica-backend
$env:DB_PORT="5433"; npx ts-node -r tsconfig-paths/register database/seed.ts   # PowerShell
# o
DB_PORT=5433 npx ts-node -r tsconfig-paths/register database/seed.ts           # bash / Git Bash
```

El script limpia todas las tablas y las repuebla con datos de prueba.

### Usuarios de prueba

| Usuario     | Contraseña  | Rol            |
|-------------|-------------|----------------|
| admin       | admin123    | Administrador  |
| mesa1       | mesa123     | Mesa de entradas |
| dr_gomez    | medico123   | Médico         |
| dr_paredes  | medico123   | Médico         |
| enf_torres  | enf123      | Enfermería     |
| enf_rios    | enf123      | Enfermería     |
| fact1       | fact123     | Facturación    |
| botiquin1   | bot123      | Botiquín       |

---

## Comandos Docker útiles

```bash
# Ver estado de los servicios
docker compose ps

# Ver logs de todos los servicios
docker compose logs

# Ver logs de un servicio específico
docker compose logs backend
docker compose logs frontend
docker compose logs postgres

# Detener todos los servicios
docker compose down

# Reconstruir imágenes (después de cambios en el código)
docker compose build --no-cache

# Reconstruir y levantar
docker compose build --no-cache && docker compose up -d
```

---

## Variables de entorno

El backend lee las siguientes variables (con sus defaults para desarrollo local):

| Variable     | Default       | Descripción              |
|--------------|---------------|--------------------------|
| `DB_HOST`    | `localhost`   | Host de PostgreSQL       |
| `DB_PORT`    | `5433`        | Puerto de PostgreSQL     |
| `DB_NAME`    | `clinica_db`  | Nombre de la base        |
| `DB_USER`    | `clinica_user`| Usuario                  |
| `DB_PASS`    | `clinica_pass`| Contraseña               |
| `JWT_SECRET` | *(ver .env)*  | Clave para tokens JWT    |
| `PORT`       | `3000`        | Puerto del servidor      |

Para desarrollo local crear `clinica-backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=clinica_db
DB_USER=clinica_user
DB_PASS=clinica_pass
JWT_SECRET=super_secret_clinica_key_change_in_prod
PORT=3000
```
