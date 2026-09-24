# apps/api — Chess Move Reader backend (Spring Boot)

Sustituye por completo al antiguo backend Python/FastAPI (retirado). Java 21 +
Spring Boot 3.5, un único proyecto Maven modular por dominio. Ver
[`docs/backend-java-architecture.md`](../../docs/backend-java-architecture.md) en
la raíz del repo para la arquitectura completa (entidades, endpoints, decisiones)
antes de añadir código — este README solo cubre cómo arrancar el scaffold.

## Estado actual: scaffold en blanco

Este proyecto **compila y arranca, pero no implementa ningún endpoint de negocio
todavía** — ni auth, ni planillas, ni el flujo de análisis/OCR. Lo que sí está
listo:

- Dependencias del `pom.xml` (ver tabla abajo).
- `application.properties` con toda la config por variables de entorno ya
  cableada (datasource, JWT, OCR, CORS, storage, actuator, springdoc).
- Paquetes por dominio creados (`auth`, `ocr`, `planillas`, `common`) con
  `package-info.java` explicando qué va en cada uno.
- `SecurityConfig` mínimo: CORS configurado desde `app.cors.allowed-origins`,
  todo permitido por ahora (`permitAll()`) porque no hay auth que aplicar
  todavía — tiene un `TODO` marcado para cuando exista el módulo `auth`.
  **Sin este `SecurityConfig`, Spring Security bloquearía toda petición por
  defecto** (genera una contraseña aleatoria y una pantalla de login), así que
  esto no es "de más", es lo mínimo para que el scaffold sea usable.
- Carpeta de migraciones Flyway (`src/main/resources/db/migration/`) vacía y
  lista — primera migración pendiente de escribir cuando se implemente `auth`.
- `Dockerfile` (build multi-stage) y wiring en el `docker-compose.yml` raíz.

**Verificado (2026-07-08)**: con JDK 21 instalado, `mvnw clean compile` da
`BUILD SUCCESS`. De paso se detectó y arregló un bug real: el `pom.xml` tenía un
comentario XML con `--` en medio (`<!-- JWT (auth module) -- ... -->`), sintaxis
inválida que rompía el parseo del POM entero — los comentarios XML no admiten
`--` salvo justo antes del `-->` de cierre.

**Pendiente de verificar**: `mvnw test` (usa Testcontainers, necesita Docker) y
`docker compose up` / el build de la imagen — el entorno donde se generó este
scaffold tenía Docker Desktop en un estado roto (error 500 en cualquier llamada a
su API) en el momento de probar. Confírmalo tú en tu máquina.

## Dependencias incluidas

| Dependencia | Para qué |
|---|---|
| `spring-boot-starter-web` | REST controllers |
| `spring-boot-starter-data-jpa` | Persistencia (Hibernate) |
| `spring-boot-starter-security` | Filtros de seguridad, CORS |
| `spring-boot-starter-validation` | `@Valid` en DTOs de entrada |
| `spring-boot-starter-actuator` | `/actuator/health` (usado por el healthcheck de docker-compose) |
| `postgresql` (driver JDBC) | — |
| `flyway-core` + `flyway-database-postgresql` | Migraciones de esquema |
| `io.jsonwebtoken:jjwt-api/-impl/-jackson` (0.12.6) | Emitir/validar JWT (auth module) |
| `springdoc-openapi-starter-webmvc-ui` (2.8.6) | Swagger UI en `/swagger-ui.html` |
| `lombok` | Reduce boilerplate en entidades/DTOs |
| `spring-boot-starter-test` + `testcontainers` (postgresql) | Tests de integración contra un Postgres real, no H2 |

## Correr en local (sin Docker)

Requiere JDK 21 y un Postgres accesible (o usa solo `docker compose up db` para
levantar únicamente la base de datos):

```bash
cd apps/api
cp ../../.env.example ../../.env   # si no existe ya; rellena JWT_SECRET
./mvnw spring-boot:run
```

**Alternativa sin Postgres propio**: `./mvnw spring-boot:test-run` arranca la app
usando `TestcontainersConfiguration` (ya generada por Spring Initializr,
`src/test/java/.../TestcontainersConfiguration.java`) — levanta un Postgres
desechable en Docker automáticamente, sin tocar `.env` ni el `db` de
docker-compose. Cómodo para iterar rápido en local.

Lee la config desde variables de entorno con los defaults de
`application.properties` (ver esa tabla ahí, no repetida aquí para no
desincronizarse). `JWT_SECRET` tiene un valor de relleno obviamente falso como
default local (`CHANGE_ME_...`) para que `mvnw spring-boot:run` no se rompa si
lo olvidas — pero **docker-compose exige que esté puesto de verdad** (falla el
arranque si `JWT_SECRET` está vacío), para no arrastrar el descuido a un entorno
compartido.

## Correr con Docker Compose

Desde la raíz del repo:

```bash
docker compose up -d db api
```

`api` expone el puerto `8000` (igual que el backend Python retirado, para no
tener que tocar `apps/web2`'s `environment.ts`). Healthcheck en
`GET /actuator/health`.

## Próximos pasos (orden sugerido, ver docs/backend-java-architecture.md)

1. `auth` — `User` entity + migración `V1__create_users.sql`, registro/login,
   emisión de JWT, y sustituir el `permitAll()` de `SecurityConfig` por un
   filtro JWT real.
2. `ocr` — `ScoresheetOcrProvider` (interfaz) + `MockScoresheetOcrProvider` +
   `HttpScoresheetOcrProvider` (delega a `apps/ocr`), `AnalysisJob` entity,
   endpoints `/api/v1/analyses/*` (mismo contrato que tenía el backend Python).
3. `planillas` — `Planilla`/`PlanillaMove` entities, endpoints
   `/api/v1/planillas/*`, generación de PGN en servidor.
