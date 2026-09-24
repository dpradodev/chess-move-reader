# Backend Java (Spring Boot) — propuesta de arquitectura

> Estado: **propuesta, sin implementar.** Este documento es la base para alinear
> antes de escribir código. Decisiones ya cerradas con el usuario están marcadas
> como tal; el resto son recomendaciones abiertas a cambio.

## Decisiones ya cerradas

- **Sustituye a `apps/api` (Python) por completo.** El nuevo backend Java pasa a
  tener auth, planillas Y la orquestación de análisis/OCR (crear análisis, hacer
  polling, guardar resultado). `apps/ocr` (Python, el que llama a Claude vision)
  **se mantiene** como microservicio aparte al que Java llama por HTTP — igual que
  hace hoy `apps/api` con su `HttpOcrClient`. No tiene sentido reescribir en Java
  la lógica de visión (prompt, JSON schema, filtro de alucinaciones con
  `python-chess`) — es la pieza que mejor encaja en Python/su ecosistema de IA, y
  ya funciona.
- **Un único Spring Boot modular** (paquetes por dominio: `auth`, `planillas`,
  `ocr`, `common`), no microservicios separados. Un solo proceso/deploy, encaja
  con el tamaño actual del proyecto (docker-compose, sin Kubernetes).

## Por qué tres módulos y cómo encajan entre sí

El pedido original agrupaba "auth", "planillas" y "comunicación con OCR" como
tres partes. Al mirar los contratos que ya existen en `apps/web2` (mockeados)
y en `apps/api`/`apps/ocr` (Python, reales), el modelo de dominio que emerge es:

```
┌─────────────┐        ┌──────────────────┐        ┌─────────────┐
│    auth     │──────▶│   ocr/analysis    │        │  planillas  │
│ User        │  owns  │ AnalysisJob       │        │ Planilla    │
│ register    │        │ (efímero, un      │───────▶│ (persistida,│
│ login       │        │  análisis OCR     │ "Guardar"│ pertenece  │
│ JWT         │        │  = subir imagen   │  crea una│ a un User) │
└─────────────┘        │  → jugadas)       │  Planilla└─────────────┘
                        └──────────────────┘   opcional
                                                 (sourceAnalysisId)
```

**`AnalysisJob` y `Planilla` NO son lo mismo**, aunque el editor los una en la
UI:

- `AnalysisJob` = una ejecución de OCR sobre una imagen concreta. Efímero,
  vive poco, existe sobre todo para el flujo de polling (`processing` →
  `done`/`error`) mientras el usuario espera en `analyzing`. Se persiste (tabla
  propia) sobre todo por auditoría/observabilidad del pipeline de OCR (igual que
  ya hace `apps/api` hoy con `moves_detected_count`, `avg_confidence`, etc.), no
  porque el usuario vaya a "volver" a un análisis viejo.
- `Planilla` = una partida guardada de verdad: metadatos (jugadores, torneo,
  fecha, ronda, mesa, resultado) + la lista final de jugadas (ya corregidas por
  el usuario en el editor, con su `status` por jugada). Pertenece a un `User`.
  Esto es lo que lista "Mis partidas" (`ArchiveService.listGames` hoy mockeado)
  y lo que abre "Ver".

El botón "Guardar" del editor (hoy mockeado, solo pone un check 2s) pasa a ser
un `POST /api/v1/planillas` real, opcionalmente con `sourceAnalysisId` si el
editor se abrió desde un análisis real (trazabilidad, no una dependencia dura —
la `Planilla` es autocontenida).

## Estructura de paquetes (Maven, un módulo)

```
com.chessmovereader
├── ChessMoveReaderApplication.java
├── common/
│   ├── config/          SecurityConfig, CorsConfig, OpenApiConfig, AsyncConfig
│   ├── error/           GlobalExceptionHandler (@ControllerAdvice), ApiError
│   └── web/             DTOs transversales (paginación, etc.)
├── auth/
│   ├── User.java                    entidad
│   ├── UserRepository.java
│   ├── AuthController.java          /api/v1/auth/*
│   ├── UserController.java          /api/v1/users/me
│   ├── JwtService.java              emitir/validar tokens
│   ├── AuthService.java
│   └── dto/  RegisterRequest, LoginRequest, AuthResponse, UserProfileResponse
├── ocr/
│   ├── ScoresheetOcrProvider.java   interfaz -- LA abstracción pedida
│   ├── MockScoresheetOcrProvider.java
│   ├── HttpScoresheetOcrProvider.java   llama a apps/ocr (Python) por HTTP
│   ├── AnalysisJob.java             entidad
│   ├── AnalysisJobRepository.java
│   ├── AnalysisController.java      /api/v1/analyses/*
│   ├── AnalysisService.java         orquesta: guarda imagen, llama al provider
│   │                                 en background, actualiza el job
│   ├── StorageService.java          filesystem + volumen, igual que Python
│   └── dto/  AnalysisCreated, AnalysisStatusResponse, OcrMoveDto
└── planillas/
    ├── Planilla.java                entidad
    ├── PlanillaMove.java            entidad (una fila por jugada)
    ├── PlanillaRepository.java
    ├── PlanillaController.java      /api/v1/planillas/*
    ├── PlanillaService.java
    ├── PgnGenerator.java            construye el PGN en servidor (cabeceras +
    │                                 cuerpo), misma lógica que hoy vive en
    │                                 apps/web2's core/utils/pgn.utils.ts
    └── dto/  PlanillaSummary, PlanillaDetail, SavePlanillaRequest, PlanillaFilters
```

## Módulo `ocr` — la abstracción pedida explícitamente

> "otra para la comunicación con los modelos u ocr que va a abstraer lo que
> haga por detrás, va a ser: te paso la imagen y me pasas la lista de
> movimientos"

Esto ya existe como patrón en Python (`OcrClient` Protocol +
`MockOcrClient`/`HttpOcrClient`) — se traduce 1:1 a una interfaz Java:

```java
public interface ScoresheetOcrProvider {
    List<OcrMove> analyze(byte[] imageBytes, String contentType);
}
```

- **`MockScoresheetOcrProvider`** — devuelve el mismo fixture fijo (apertura
  Ruy López con un hueco) que ya usan `apps/api`, `apps/web` y `apps/web2` —
  mantener el mismo fixture en los cuatro sitios evita sorpresas al probar
  end-to-end con mocks en distintas capas a la vez.
- **`HttpScoresheetOcrProvider`** — llama a `apps/ocr`'s `POST /analyze`
  (multipart, campo `image`, PNG/JPEG/WEBP) vía `RestClient`, contrato exacto
  ya verificado: `{"moves": [{"san": string, "confidence": 0-100}, ...]}`.
- Selección por config (mismo patrón que las env vars `OCR_CLIENT`/
  `OCR_SERVICE_URL` de Python, para no romper la costumbre):
  `ocr.client=mock|http`, `ocr.service-url=http://ocr:8000`.

`AnalysisService` usa el provider dentro de un job asíncrono (`@Async` +
`ThreadPoolTaskExecutor`, o `CompletableFuture` — el mismo patrón "in-process
background task" que ya usa Python con `BackgroundTasks`; no hace falta cola de
mensajes todavía, incluso menos que en Python porque Spring facilita mover esto
a un executor/cola real más adelante sin tocar el contrato HTTP).

## Contratos HTTP (mantener forma, adaptar mayúsculas/minúsculas)

Los contratos ya verificados en Python se mantienen prácticamente iguales —
minimiza el trabajo de adaptar `apps/web2` cuando se conecte de verdad. Único
cambio real: JSON en camelCase (`createdAt` en vez de `created_at`), y
`apps/web2`'s `AnalysisStatusResponse` tendrá que añadir esos dos campos que
hoy omite (no rompe nada, son opcionales de usar).

### `auth` (nuevo, no existe en Python)

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/api/v1/auth/register` | `{name, email, password}` | `{accessToken, user: {id, name, email}}` |
| POST | `/api/v1/auth/login` | `{email, password}` | `{accessToken, user: {...}}` |
| POST | `/api/v1/auth/refresh` | `{refreshToken}` | `{accessToken}` |
| GET  | `/api/v1/users/me` | — (Bearer token) | `{id, name, email}` |

Mapea a `AuthService.login/register/logout` + `UserProfile` de `apps/web2` —
hoy el mock ignora la contraseña por completo; el backend real por supuesto la
verifica (BCrypt).

### `ocr` / análisis (ya existe en Python, se porta con mismo shape)

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/api/v1/analyses` | multipart `image` | `201 {id, status: "processing"}` |
| GET  | `/api/v1/analyses/{id}` | — | `{id, status, moves: [{san,confidence}]\|null, error, createdAt, completedAt}` |
| GET  | `/api/v1/analyses/{id}/image` | — | bytes de la imagen original |

Mapea directo a `AnalysisService.createAnalysis/getAnalysis` de `apps/web2`.
**Recomendación nueva** (Python no lo exige hoy porque no hay auth): una vez
existan cuentas, `POST /api/v1/analyses` debería requerir sesión — ata el
análisis a un `ownerId` desde el principio, útil para "guardar como planilla"
y para no tener un endpoint de subida de imágenes completamente anónimo.

### `planillas` (nuevo, no existe en Python)

| Método | Ruta | Query/Body | Respuesta |
|---|---|---|---|
| GET | `/api/v1/planillas` | `?search=&tournament=&result=&dateFrom=&dateTo=&page=&size=` | página de `PlanillaSummary[]` |
| GET | `/api/v1/planillas/{id}` | — | `PlanillaDetail` (metadatos + jugadas) |
| POST | `/api/v1/planillas` | `SavePlanillaRequest` (metadatos + jugadas + `sourceAnalysisId?`) | `PlanillaDetail` |
| PUT | `/api/v1/planillas/{id}` | `SavePlanillaRequest` | `PlanillaDetail` |
| DELETE | `/api/v1/planillas/{id}` | — | `204` |
| GET | `/api/v1/planillas/{id}/pgn` | — | `text/plain`, PGN generado en servidor |

Mapea a `ArchiveService.listGames(filters)` (el filtrado ya vive "en el
servicio" en el mock — aquí simplemente se vuelve una query real con esos
mismos parámetros, no hay que tocar la forma en el frontend) y desbloquea a la
vez: el botón "Guardar" del editor, el "Ver" de `archive` (hoy siempre abre en
blanco porque no hay datos reales que cargar), y el botón "PGN" por tarjeta
(hoy deshabilitado a propósito con tooltip, exactamente por esto).

## Un detalle a corregir en el contrato: el resultado de la partida

`apps/web2` usa hoy `'1-0' | '0-1' | '½-½' | '*'` (con el símbolo unicode de
fracción) tanto en `GameMeta.result` como en `ArchiveGame.result`. Para el PGN
de verdad ya se traduce a `'1/2-1/2'` (ASCII, lo que exige lichess/chess.com al
importar) en `pgn.utils.ts`. **Recomendación**: que la API solo hable en ASCII
(`1-0`/`0-1`/`1/2-1/2`/`*`) y que la traducción a "½-½" para mostrar en la UI
se quede como un detalle puramente de presentación en el frontend (ya existe
`metaResultToGameResult` ahí, es cuestión de invertirla para lectura) — evita
que un símbolo unicode acabe alguna vez escapado/mal codificado en JSON o en
una columna de base de datos.

## Modelo de datos (PostgreSQL, mismo que ya corre en docker-compose)

```sql
-- auth
users (id uuid pk, email text unique, password_hash text, name text,
       created_at timestamptz, updated_at timestamptz)

-- ocr
analysis_jobs (id uuid pk, owner_id uuid fk users nullable,
               status text, image_path text, image_content_type text,
               error_message text nullable,
               created_at timestamptz, completed_at timestamptz nullable)
analysis_job_moves (id bigint pk, analysis_job_id uuid fk,
                     ply_index int, san text, confidence int)

-- planillas
planillas (id uuid pk, owner_id uuid fk users,
           white text, black text, tournament text, date date,
           round text, table_number text, result text, -- ascii: 1-0/0-1/1/2-1/2/*
           source_analysis_id uuid fk analysis_jobs nullable,
           created_at timestamptz, updated_at timestamptz)
planilla_moves (id bigint pk, planilla_id uuid fk,
                 ply_index int, notation text, from_square text, to_square text,
                 confidence int, status text) -- validated/manual/inferred/unvalidated/gap
```

`planilla_moves.status` usa los mismos cinco valores que `MoveStatus` en el
frontend (`validated|manual|inferred|unvalidated|gap`) — ese vocabulario ya es
estable y probado (huecos, inferencia, revalidación en cascada), no hace falta
reinventarlo en el backend, solo persistirlo tal cual.

**Migraciones**: Flyway desde el día uno (`src/main/resources/db/migration/`),
no `ddl-auto=update`. Python usa `create_all()` sin migraciones — está anotado
en la memoria del proyecto como "simplificación a revisar"; en Java, con Flyway
ya integrado en el ecosistema Spring Boot, no hay razón para repetir ese atajo.

## Stack técnico recomendado

| Pieza | Elección | Por qué |
|---|---|---|
| Java | 21 (LTS) | virtual threads disponibles si interesan para el job de OCR (I/O-bound) sin montar stack reactivo completo |
| Framework | Spring Boot 3.3+ | está en el pedido |
| Build | Maven | más "aburrido"/estándar que Gradle, encaja con el resto de elecciones del proyecto (FastAPI+SQLAlchemy, nada exótico) |
| Persistencia | Spring Data JPA + Hibernate | estándar |
| Migraciones | Flyway | ver arriba |
| Auth | Spring Security + JWT (access token; refresh token opcional en una v2) | API REST + SPA en otro origen, JWT stateless es el patrón habitual aquí |
| Validación | Jakarta Bean Validation (`@Valid`) | estándar |
| Documentación API | springdoc-openapi (Swagger UI) | barato de añadir, útil mientras la superficie de la API crece |
| Tests | JUnit 5 + Testcontainers (Postgres real en tests de integración) | evita "funciona con H2 pero no con Postgres de verdad" |
| Storage de imágenes | filesystem + volumen Docker, igual que Python (`STORAGE_DIR`) | no hay motivo para saltar a S3/MinIO todavía |
| Contenedor | `Dockerfile` propio (build multi-stage, `eclipse-temurin`), sustituye al servicio `api` en `docker-compose.yml` | mismo puerto 8000 si se quiere mantener sin tocar `apps/web2`'s `environment.ts` |

## Orden de construcción sugerido

1. **`auth`** primero — `planillas` necesita un dueño (`owner_id`) desde su
   primera migración, así que sin usuarios no hay nada que enganchar después.
2. **`ocr`/`analysis`** segundo — es prácticamente un port 1:1 de lo que ya
   funciona en Python (mismo contrato, mismo patrón mock/http), bajo riesgo.
3. **`planillas`** tercero — la pieza nueva de verdad; conecta "Guardar" y
   "Mis partidas" a datos reales por primera vez.

## Migración desde `apps/api` (Python)

Bajo riesgo: hoy `apps/api` no tiene usuarios ni planillas (no hay nada que
migrar ahí), y su única tabla real (`analysis_requests`/`analysis_moves`) es
efímera por diseño (jobs de OCR, no partidas guardadas) — un corte limpio
(retirar Python, arrancar Java con Flyway desde cero) es razonable para un MVP,
sin script de migración de datos. Si en algún momento el histórico de
`analysis_requests` importa para auditar el pipeline de OCR, se puede
exportar/importar aparte, pero no parece necesario ahora mismo.

## Preguntas abiertas (recomendaciones mías, no decisiones cerradas)

Todo lo de la tabla de stack técnico y lo siguiente son propuestas — decirme si
alguna no encaja antes de que empecemos a implementar:

1. **JWT solo access token vs. access+refresh** — propongo empezar con solo
   access token (más simple) y añadir refresh token si el tiempo de expiración
   corto empieza a ser molesto en el uso real. ¿de acuerdo, o prefieres
   access+refresh desde el principio?
2. **`POST /api/v1/analyses` requiere sesión** — cambio de comportamiento
   respecto a hoy (Python lo deja anónimo porque no hay auth). ¿Lo confirmamos?
3. **Puerto del nuevo servicio** — ¿mantener 8000 (mismo que `apps/api` hoy,
   cero cambios en `apps/web2`) o correr en un puerto nuevo mientras convive
   temporalmente con el Python para probar antes de retirarlo?
4. **Maven vs Gradle** — propongo Maven por convención/sencillez, pero es una
   preferencia débil de mi parte, dímelo si tienes preferencia por Gradle.
