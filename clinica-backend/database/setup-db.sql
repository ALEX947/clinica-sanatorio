-- Ejecutar conectado como superusuario (postgres)
-- En pgAdmin: clic derecho en "postgres" > Query Tool, pegar y ejecutar
-- En psql: psql -U postgres -f setup-db.sql

-- ── Usuario y base de datos de producción ────────────────────────────────────
CREATE USER clinica_user WITH PASSWORD 'clinica_pass';

CREATE DATABASE clinica_db OWNER clinica_user;
GRANT ALL PRIVILEGES ON DATABASE clinica_db TO clinica_user;

-- ── Base de datos de pruebas (tests de integración) ───────────────────────────
-- Las tablas las crea TypeORM automáticamente con synchronize: true al correr los tests.
-- Ejecutar: npm run test:integration
CREATE DATABASE clinica_test_db OWNER clinica_user;
GRANT ALL PRIVILEGES ON DATABASE clinica_test_db TO clinica_user;
