# Frontend Routing Authorization Specification

## Purpose

Define how the frontend MUST handle navigation to routes that are not permitted for the authenticated user's role. Unauthorized route access MUST result in a "not found" experience, not partial or empty content.

## Requirements

### Requirement: Route Authorization Guard

The system MUST prevent authenticated users from viewing pages that their role does not permit. When a user navigates to a restricted route — whether by direct URL, browser history, or programmatic navigation — the application MUST render a NotFound page, indistinguishable from a genuine 404.

The system MUST use the existing `ROL_KEYS` map in `AppLayout.tsx` as the single source of truth for role-to-route permissions.

#### Scenario: Direct URL access to unauthorized route

- GIVEN an authenticated user with role `enfermeria`
- WHEN they navigate directly to `/usuarios` or `/facturacion`
- THEN the application MUST render the NotFound page
- AND the URL in the browser MUST remain unchanged (no redirect)
- AND the page MUST not reveal that the route exists or that access was denied

#### Scenario: Authorized user accesses permitted route

- GIVEN an authenticated user with role `admin`
- WHEN they navigate to `/usuarios`
- THEN the application MUST render the Usuarios page normally

#### Scenario: Role with partial module access

- GIVEN an authenticated user with role `mesa_entradas`
- WHEN they navigate to `/maestros/pacientes` (permitted for their role)
- THEN the application MUST render the page normally
- WHEN they navigate to `/maestros/obras-sociales` (not permitted)
- THEN the application MUST render the NotFound page

#### Scenario: Unauthenticated user (existing behavior — unchanged)

- GIVEN a user with no active session
- WHEN they navigate to any protected route
- THEN the application MUST redirect to `/login` (ProtectedRoute behavior — not modified by this change)

---

### Requirement: NotFound Page

The application MUST have a NotFound page component that renders a user-friendly "página no encontrada" message with no indication of whether the route exists or whether access was denied.

#### Scenario: NotFound renders consistently

- GIVEN any route that does not exist OR any route the user's role cannot access
- WHEN the NotFound page is rendered
- THEN the page MUST display a clear "Página no encontrada" heading
- AND MUST offer a link to navigate back to `/` (home)
- AND MUST NOT display any error code, "acceso denegado", or role-specific message

---

### Requirement: Menu Consistency

The sidebar menu MUST NOT display links to routes the current user cannot access. This requirement extends the existing `ROL_KEYS` filtering already in `AppLayout.tsx` — the guard and the menu MUST use the same source of truth.

#### Scenario: Menu does not expose unauthorized routes

- GIVEN an authenticated user with role `enfermeria`
- WHEN they view the sidebar menu
- THEN items for `/usuarios`, `/facturacion`, and other non-permitted routes MUST NOT appear
- AND navigating directly to those URLs MUST still render NotFound (defense in depth)
