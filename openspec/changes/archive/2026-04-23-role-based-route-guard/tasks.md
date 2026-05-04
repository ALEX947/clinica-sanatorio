# Tasks: Role-Based Route Guard

## Phase 1: Foundation

- [x] 1.1 Crear `clinica-frontend/src/pages/NotFoundPage.tsx` — componente que muestre "Página no encontrada", un mensaje descriptivo sin mencionar permisos o roles, y un botón/link `<Link to="/">Volver al inicio</Link>` usando Ant Design (`Result` o `Typography`)

## Phase 2: Core Implementation

- [x] 2.1 En `clinica-frontend/src/components/AppLayout.tsx`, agregar la función `isRoutePermitted(pathname: string, permitidos: string[]): boolean` — usar exact match (`pathname === key`) y prefix match (`pathname.startsWith(key + '/')`) para manejar sub-rutas; excluir group keys sin leading slash (como `'maestros'`)
- [x] 2.2 En `AppLayout.tsx`, reemplazar `<Outlet />` en el `<Content>` por renderizado condicional: si `isRoutePermitted(location.pathname, permitidos)` → `<Outlet />`; si no → `<NotFoundPage />`

## Phase 3: Wiring

- [x] 3.1 En `clinica-frontend/src/App.tsx`, importar `NotFoundPage` y agregar `<Route path="*" element={<NotFoundPage />} />` como último child de la ruta protegida (dentro del `<Route path="/">` con `AppLayout`) para cubrir URLs que no existen en el router

## Phase 4: Manual Verification

- [ ] 4.1 Loguearse como `enfermeria` → navegar directamente a `localhost:5173/usuarios` → debe aparecer NotFoundPage; URL no debe cambiar
- [ ] 4.2 Loguearse como `enfermeria` → navegar a `localhost:5173/facturacion` → NotFoundPage
- [ ] 4.3 Loguearse como `admin` → navegar a `localhost:5173/usuarios` → página de Usuarios renderiza normalmente
- [ ] 4.4 Loguearse como `mesa_entradas` → `/maestros/pacientes` (permitido) → página normal; `/maestros/obras-sociales` (no permitido) → NotFoundPage
- [ ] 4.5 Loguearse como `enfermeria` → navegar a `/internaciones/1` (sub-ruta, rol tiene `/internaciones`) → página normal; no debe bloquearse por el prefix match
- [ ] 4.6 Navegar a `localhost:5173/ruta-inexistente` (sin importar el rol) → NotFoundPage vía el `*` catch-all
- [ ] 4.7 Verificar que el menú lateral sigue mostrando solo los ítems permitidos para cada rol (comportamiento previo sin regresar)
