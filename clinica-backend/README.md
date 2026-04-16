# Sistema de Administración de Clínica/Sanatorio — Backend

API REST desarrollada con NestJS y PostgreSQL para la gestión integral de una clínica privada.
Cubre internaciones, prescripciones, enfermería, botiquín, facturación a Obras Sociales y cuentas de prestadores.

## Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS 11 + TypeScript
- **Base de datos:** PostgreSQL 16+
- **ORM:** TypeORM (synchronize en desarrollo)
- **Auth:** JWT + Passport.js
- **Documentación:** Swagger UI (`/api/docs`)

## Requisitos previos

- Node.js 20 o superior
- PostgreSQL 16 o superior (corriendo localmente o en Docker)

## Instalación

```bash
npm install
```

## Configuración de la base de datos

Crear el usuario y la base de datos en PostgreSQL (una sola vez):

```sql
CREATE USER clinica_user WITH PASSWORD 'clinica_pass';
CREATE DATABASE clinica_db OWNER clinica_user;
GRANT ALL PRIVILEGES ON DATABASE clinica_db TO clinica_user;
```

El archivo `.env` ya viene configurado para desarrollo local:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clinica_db
DB_USER=clinica_user
DB_PASS=clinica_pass
JWT_SECRET=super_secret_clinica_key_change_in_prod
PORT=3000
```

## Cargar datos iniciales

Ejecutar el seed una sola vez para poblar las tablas maestras:

```bash
npx ts-node -r tsconfig-paths/register seed.ts
```

Carga: usuarios, tipos de profesión, profesionales, obras sociales, sectores, camas, pacientes, nomenclador INOS y aranceles.

## Ejecutar en desarrollo

```bash
npm run start:dev
```

La API queda disponible en `http://localhost:3000`.
Swagger UI en `http://localhost:3000/api/docs`.

## Usuarios de prueba

| Usuario      | Contraseña  | Rol             |
|--------------|-------------|-----------------|
| admin        | admin123    | Administrador   |
| mesa1        | mesa123     | Mesa de Entradas|
| dr_gomez     | medico123   | Médico          |
| dr_paredes   | medico123   | Médico          |
| enf_torres   | enf123      | Enfermería      |
| enf_rios     | enf123      | Enfermería      |
| fact1        | fact123     | Facturación     |
| botiquin1    | bot123      | Botiquín        |

## Módulos y endpoints

| Módulo           | Prefijo API                  | Descripción |
|------------------|------------------------------|-------------|
| Auth             | `/auth`                      | Login, gestión de usuarios |
| Pacientes        | `/maestros/pacientes`        | ABM de pacientes |
| Profesionales    | `/maestros/profesionales`    | ABM de profesionales |
| Obras Sociales   | `/maestros/obras-sociales`   | ABM de OS |
| Nomenclador INOS | `/maestros/nomenclador`      | Prácticas y aranceles |
| Camas            | `/maestros/camas`            | Camas y sectores |
| Internaciones    | `/internaciones`             | Admisión, alta, garantías |
| Prescripciones   | `/prescripciones`            | Prácticas, medicamentos, controles |
| Enfermería       | `/enfermeria`                | Agenda de suministros y controles, historial |
| Botiquín         | `/botiquin`                  | Solicitudes, entregas y devoluciones de medicamentos |
| Facturación      | `/facturacion`               | Facturas, liquidaciones, cuentas |
| Mesa de Entradas | `/mesa-entradas`             | Autorizaciones y altas |

## Control de acceso (RBAC)

Cada endpoint está protegido por JWT y restringido a los roles que corresponden según la lógica del sanatorio. Los roles son: `admin`, `medico`, `enfermeria`, `mesa_entradas`, `facturacion`, `botiquin`.

## Tests

```bash
# Unitarios
npm run test

# Unitarios con watch
npm run test:watch

# Integración (requiere clinica_test_db corriendo — ver setup-db.sql)
npm run test:integration

# End to End (requiere la base de datos corriendo)
npm run test:e2e

# Cobertura
npm run test:cov
```

### Base de datos para tests de integración

Los tests de integración usan `clinica_test_db`. Crearla una vez:

```sql
CREATE DATABASE clinica_test_db OWNER clinica_user;
GRANT ALL PRIVILEGES ON DATABASE clinica_test_db TO clinica_user;
```

## Build para producción

```bash
npm run build
npm run start:prod
```

> En producción reemplazar `synchronize: true` por migraciones de TypeORM y cambiar `JWT_SECRET` por un valor seguro.
