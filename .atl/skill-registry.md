# Skill Registry — clinica

Generated: 2026-04-20
Project: clinica (NestJS + React)

---

## User Skills

| Skill | Trigger Context |
|-------|----------------|
| `branch-pr` | Creating a PR, opening a pull request, preparing changes for review |
| `go-testing` | Writing Go tests, Bubbletea TUI testing, teatest — NOT applicable here |
| `issue-creation` | Creating GitHub issues, bug reports, feature requests |
| `judgment-day` | User says "judgment day", "doble review", "juzgar", adversarial review |
| `skill-creator` | Creating new skills, documenting patterns for AI |
| `skill-registry` | Updating or regenerating the skill registry |
| `sdd-explore` | Investigating a feature or problem before committing |
| `sdd-propose` | Creating a change proposal |
| `sdd-spec` | Writing specifications and scenarios |
| `sdd-design` | Technical architecture design |
| `sdd-tasks` | Breaking down a change into tasks |
| `sdd-apply` | Implementing tasks from a change |
| `sdd-verify` | Validating implementation against specs |
| `sdd-archive` | Closing a completed change |

---

## Project Convention Files

| File | Purpose |
|------|---------|
| [`AGENTS.md`](../AGENTS.md) | Code review rules for GGA (Gentleman Guardian Angel) — NestJS + React standards |
| [`.gga`](../.gga) | GGA configuration — provider Claude, patterns TS/TSX/JS/JSX |

---

## Compact Rules

### NestJS Backend (`clinica-backend/src/**/*.ts`)

- Controllers: delegate only — NO business logic
- Services: all business logic here — use NestJS exceptions (`NotFoundException`, `BadRequestException`, etc.)
- DTOs: class-validator decorators required (`@IsString`, `@IsNotEmpty`, etc.)
- Entities: typed relations, no `any`, `@PrimaryGeneratedColumn` required
- Guards: `@Roles()` on all protected endpoints
- Never expose passwords/tokens in responses

### React Frontend (`clinica-frontend/src/**/*.tsx`)

- Functional components only — no class components
- Props: explicit types (interface/type) — no `any`
- HTTP calls: service/hook layer only — never fetch directly in component
- State: no prop drilling > 2 levels
- No `dangerouslySetInnerHTML` without sanitization

### General

- No `console.log` in production code
- No `.env` with real values committed
- Names in English; comments may be in Spanish
- No `// TODO` without description
