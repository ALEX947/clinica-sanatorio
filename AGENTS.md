# Code Review Rules — Clínica/Sanatorio

## Stack
- Backend: NestJS + TypeORM + PostgreSQL
- Frontend: React + TypeScript + Context API

---

## BACKEND (NestJS)

### Controllers
- Solo deben delegar al service. NUNCA lógica de negocio en el controller.
- Todos los endpoints deben tener decoradores de roles (`@Roles`) si el recurso es protegido.
- Usar DTOs tipados para body/params. No aceptar `any` como tipo de entrada.

### Services
- Toda la lógica de negocio va aquí.
- No deben acceder directamente a `req` o contexto HTTP.
- Manejo de errores con excepciones de NestJS (`NotFoundException`, `BadRequestException`, etc.). No lanzar `Error` genérico.

### Entities (TypeORM)
- Toda entidad debe tener `@PrimaryGeneratedColumn` o `@PrimaryColumn`.
- Relaciones deben estar tipadas con `Relation<T>` o el tipo correspondiente.
- No usar `any` en propiedades de entidades.

### DTOs
- Usar `class-validator` decorators (`@IsString`, `@IsNotEmpty`, etc.).
- Separar DTOs de creación y actualización cuando corresponda.

### Seguridad
- Nunca exponer passwords o tokens en respuestas.
- Guards de autenticación aplicados a controllers sensibles.
- No hardcodear credenciales, IPs ni secrets en el código.

---

## FRONTEND (React)

### Componentes
- Componentes funcionales únicamente. Prohibido class components.
- Props deben tener tipos explícitos (interface o type). No usar `any`.
- Un componente = una responsabilidad. Si supera 200 líneas, probablemente hace demasiado.

### Estado
- Estado global solo en Context o store dedicado. No prop drilling más de 2 niveles.
- No mutar estado directamente. Siempre usar el setter.

### Llamadas a API
- Todas las llamadas HTTP deben manejar el estado de error.
- No hacer fetch directamente en el componente — usar un service/hook dedicado.

### Seguridad
- No exponer tokens en `localStorage` sin necesidad.
- No renderizar HTML crudo con `dangerouslySetInnerHTML` sin sanitizar.

---

## GENERAL

- No dejar `console.log` en código productivo.
- No commitear archivos `.env` con valores reales.
- Nombres en inglés para variables, funciones y clases. Comentarios pueden ser en español.
- Prohibido `// TODO` sin descripción o ticket asociado.
