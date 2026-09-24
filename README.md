# chess-move-reader

Angular + computer vision app to read chess scoresheets, validate moves and export PGN.

## Estructura del repo

```
apps/
  web/       Angular 22 — analizador de una planilla suelta (sube, revisa, exporta PGN)
  web2/      Angular 22 — "ChessKeeper", evolución a gestor de planillas (biblioteca de partidas, cuentas). En construcción, convive con apps/web.
  api/       Java 21 + Spring Boot + PostgreSQL — auth, gestión de planillas y orquestación de análisis/OCR.
             Scaffold en blanco ahora mismo (sin endpoints todavía), ver apps/api/README.md.
  ocr/       FastAPI — transcribe la planilla con el modelo de visión de Claude
design/      Export de Figma Make del diseño de apps/web2 (React/Vite, solo referencia — no se ejecuta)
packages/
  samples/   Imágenes de ejemplo para probar el flujo de OCR
docs/        Documentación de arquitectura, contrato de API y roadmap
```

`apps/api` (Java) llamará a `apps/ocr` a través de un cliente intercambiable
(`OCR_CLIENT=mock|http`) — el mismo patrón que tenía el backend Python que
sustituye, documentado en
[`docs/backend-java-architecture.md`](docs/backend-java-architecture.md), pero
**todavía no implementado**: `apps/api` es un scaffold sin endpoints de negocio
por ahora, así que el flujo de subir-planilla-y-analizar de `apps/web` no
funciona end-to-end hasta que se implemente. `apps/web2` sigue funcionando
igual porque todos sus servicios están mockeados en el propio frontend.

## Requisitos

- [Node.js](https://nodejs.org/) 20+ y [Angular CLI](https://angular.dev/tools/cli) (`npm i -g @angular/cli`)
- [Java](https://adoptium.net/) 21 + Maven (o usa el wrapper `./mvnw` de `apps/api`, no requiere Maven instalado aparte)
- [Python](https://www.python.org/) 3.12+ (solo para `apps/ocr`)
- [Docker](https://www.docker.com/) + Docker Compose (para Postgres, y opcionalmente para correr los servicios en contenedor)

## Arranque rápido

1. Copia las variables de entorno y rellena `JWT_SECRET` (obligatorio para
   `docker compose up`, ver comentario en el propio archivo):

   ```bash
   cp .env.example .env
   ```

2. Levanta la base de datos, la API y el servicio de OCR con Docker Compose (desde la raíz del repo):

   ```bash
   docker compose up -d
   ```

   La API queda disponible en `http://localhost:8000` (Swagger UI en `/swagger-ui.html`), el servicio de
   OCR en `http://localhost:8001`, y Postgres en `localhost:5432`. Si prefieres correr algún servicio
   fuera de Docker (por ejemplo para iterar más rápido), levanta sólo la base de datos con
   `docker compose up -d db` y sigue las instrucciones de [`apps/api/README.md`](apps/api/README.md)
   (`./mvnw spring-boot:run`) / [`apps/ocr/README.md`](apps/ocr/README.md) (`uvicorn --reload`).

   Por defecto la API usará el cliente OCR mock (`OCR_CLIENT=mock` en `.env`) una vez esté
   implementado, así que no hará falta ninguna API key para probar el flujo completo. Para usar el
   OCR real, añade tu `ANTHROPIC_API_KEY` en `.env` y cambia `OCR_CLIENT=http`.

3. En otra terminal, levanta el frontend que quieras probar:

   ```bash
   cd apps/web2   # o apps/web
   npm install
   npm start
   ```

   `apps/web` queda en `http://localhost:4200/` y apunta a la API en `http://localhost:8000`
   (configurable en `apps/web/src/environments/environment.ts`) — **no funcionará end-to-end
   todavía**, ver nota más arriba. `apps/web2` queda en `http://localhost:4201/` y no necesita
   ningún backend levantado (todo mockeado en el propio frontend).

## Más detalles

- [`apps/web/README.md`](apps/web/README.md) — comandos de Angular CLI (build, test, e2e).
- [`apps/web2/README.md`](apps/web2/README.md) — qué es "ChessKeeper", de dónde viene el diseño y qué pantallas están portadas.
- [`docs/chess-board.md`](docs/chess-board.md) — arquitectura del tablero (`<app-board>`), API pública, animación, drag & drop con Pointer Events.
- [`docs/backend-java-architecture.md`](docs/backend-java-architecture.md) — arquitectura del nuevo backend Java (módulos, entidades, contratos HTTP, roadmap de implementación).
- [`apps/api/README.md`](apps/api/README.md) — estado del scaffold, dependencias, cómo arrancarlo.
- [`apps/ocr/README.md`](apps/ocr/README.md) — cómo transcribe la planilla con el modelo de visión de Claude y filtra alucinaciones.
- [`docs/database.md`](docs/database.md) — cómo conectarte a Postgres (algunos detalles son del backend Python retirado, pendiente de repasar).
- [`docs/images.md`](docs/images.md) — cómo ver las imágenes de planillas subidas (pendiente de repasar tras el cambio de backend).
- [`docs/`](docs) — arquitectura, contrato de API, pipeline de visión y roadmap.
