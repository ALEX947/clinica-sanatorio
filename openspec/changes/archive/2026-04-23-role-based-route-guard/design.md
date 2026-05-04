# Design: Role-Based Route Guard

## Technical Approach

Add role-based route authorization to the frontend by intercepting rendering inside `AppLayout` — where role and permitted routes are already computed — and replacing `<Outlet />` with `<NotFoundPage />` when the current path is not in the user's `ROL_KEYS` entry. Add a true `*` catch-all route in `App.tsx` for paths that don't exist in the router at all.

No new context, no new state, no backend changes.

## Architecture Decisions

| Decision | Choice | Alternatives Rejected | Rationale |
|----------|--------|-----------------------|-----------|
| Guard location | Inside `AppLayout.tsx` (replaces `<Outlet />`) | New `RoleGuard` wrapper per-route in `App.tsx` | AppLayout already owns `rol` and `permitidos` — zero duplication, one change point |
| On unauthorized: render vs redirect | Render `<NotFoundPage />` in-place | `<Navigate to="/not-found" replace />` | Spec requires URL to remain unchanged; redirect exposes that the route exists |
| `ROL_KEYS` location | Keep in `AppLayout.tsx` | Extract to `src/utils/roles.ts` | Minimal change surface; both the menu filter and the new guard live in the same file |
| True 404s | `<Route path="*">` in `App.tsx` | Rely only on AppLayout guard | Routes not registered in the router (typos, deleted paths) must also show NotFound |

## Data Flow

```
User navigates to /usuarios (role: enfermeria)
       │
       ▼
ProtectedRoute — authenticated? YES
       │
       ▼
AppLayout renders
  rol = 'enfermeria'
  permitidos = ROL_KEYS['enfermeria']
  // ['/', '/internaciones', '/enfermeria', '/botiquin']
       │
       ▼
isRoutePermitted('/usuarios', permitidos)
       │ NO
       ▼
Content renders <NotFoundPage />   ← URL stays /usuarios
```

```
User navigates to /internaciones/123 (role: enfermeria)
       │
  isRoutePermitted('/internaciones/123', permitidos)
  → checks '/internaciones': '/internaciones/123'.startsWith('/internaciones/') → TRUE
       │ YES
       ▼
Content renders <Outlet />  →  InternacionDetallePage
```

## Matching Logic

```typescript
function isRoutePermitted(pathname: string, permitidos: string[]): boolean {
  return permitidos.some(key => {
    if (!key.startsWith('/')) return false; // skip group keys like 'maestros'
    return pathname === key || pathname.startsWith(key + '/');
  });
}
```

Handles sub-routes (`/internaciones/:id`, `/internaciones/nueva`) via prefix match without listing them explicitly in `ROL_KEYS`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/pages/NotFoundPage.tsx` | Create | Renders "Página no encontrada" + link to `/` |
| `src/components/AppLayout.tsx` | Modify | Add `isRoutePermitted()`, conditionally render `<Outlet />` or `<NotFoundPage />` in Content |
| `src/App.tsx` | Modify | Add `<Route path="*" element={<NotFoundPage />} />` as last child of the protected layout |

## Interfaces / Contracts

```typescript
// Local to AppLayout.tsx — not exported
function isRoutePermitted(pathname: string, permitidos: string[]): boolean

// NotFoundPage — no props
export default function NotFoundPage(): JSX.Element
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `isRoutePermitted()` logic (all roles, sub-routes, group keys) | Manual in browser — no frontend test runner detected |
| Manual | role `enfermeria` → direct URL to `/usuarios`, `/facturacion` → NotFound | Browser |
| Manual | role `admin` → same URLs → page renders normally | Browser |
| Manual | `/maestros/pacientes` for `mesa_entradas` → allowed; `/maestros/obras-sociales` → NotFound | Browser |
| Manual | Non-existent URL `/foo/bar` → NotFound (via `*` route) | Browser |

> Note: `openspec/config.yaml` confirms no frontend test runner is available. All verification is manual.

## Migration / Rollout

No migration required. Pure frontend change. No API, no DB, no backend modifications.

## Open Questions

- None.
