# chess-move-reader

Angular + computer vision app to read chess scoresheets, validate moves and export PGN.

## Estructura del repo

```
apps/
  web/       Angular 22 — analizador de una planilla suelta (sube, revisa, exporta PGN)
  web2/      Angular 22 — "ChessKeeper", evolución a gestor de planillas (biblioteca de partidas, cuentas). En construcción, convive con apps/web.
  api/       FastAPI + PostgreSQL — recibe la petición de análisis, guarda imagen/logs/jugadas
  ocr/       FastAPI — transcribe la planilla con el modelo de visión de Claude
design/      Export de Figma Make del diseño de apps/web2 (React/Vite, solo referencia — no se ejecuta)
packages/
  samples/   Imágenes de ejemplo para probar el flujo de OCR
docs/        Documentación de arquitectura, contrato de API y roadmap
```

`apps/api` habla con `apps/ocr` a través de un cliente intercambiable
(`OCR_CLIENT=mock|http`): por defecto usa un mock (partida de ejemplo, sin coste ni
API key) para poder probar el flujo completo ya mismo; con `OCR_CLIENT=http` delega en
`apps/ocr`, que necesita `ANTHROPIC_API_KEY` (ver `apps/ocr/README.md`).

## Requisitos

- [Node.js](https://nodejs.org/) 20+ y [Angular CLI](https://angular.dev/tools/cli) (`npm i -g @angular/cli`)
- [Python](https://www.python.org/) 3.12+
- [Docker](https://www.docker.com/) + Docker Compose (para Postgres, y opcionalmente para correr la API en contenedor)

## Arranque rápido

1. Copia las variables de entorno:

   ```bash
   cp .env.example .env
   ```

2. Levanta la base de datos y la API con Docker Compose (desde la raíz del repo):

   ```bash
   docker compose up -d
   ```

   La API queda disponible en `http://localhost:8000` (docs interactivas en `/docs`), el servicio de
   OCR en `http://localhost:8001`, y Postgres en `localhost:5432`. Si prefieres correr algún servicio
   fuera de Docker (por ejemplo para iterar más rápido), levanta sólo la base de datos con
   `docker compose up -d db` y sigue las instrucciones de [`apps/api/README.md`](apps/api/README.md) /
   [`apps/ocr/README.md`](apps/ocr/README.md) para correrlos con `uvicorn --reload`.

   Por defecto la API usa el cliente OCR mock (`OCR_CLIENT=mock` en `.env`), así que no hace falta
   ninguna API key para probar el flujo completo. Para usar el OCR real, añade tu
   `ANTHROPIC_API_KEY` en `.env` y cambia `OCR_CLIENT=http`.

3. En otra terminal, levanta el frontend:

   ```bash
   cd apps/web
   npm install
   npm start
   ```

   La web queda en `http://localhost:4200/` y ya apunta a la API en `http://localhost:8000`
   (configurable en `apps/web/src/environments/environment.ts`).

4. Abre `http://localhost:4200/`, sube una planilla (o una imagen de `packages/samples/raw`) y pide el análisis.

## Más detalles

- [`apps/web/README.md`](apps/web/README.md) — comandos de Angular CLI (build, test, e2e).
- [`apps/web2/README.md`](apps/web2/README.md) — qué es "ChessKeeper", de dónde viene el diseño y qué queda pendiente de portar.
- [`docs/chess-board.md`](docs/chess-board.md) — arquitectura del tablero (`<app-board>`), API pública, animación, drag & drop con Pointer Events.
- [`apps/api/README.md`](apps/api/README.md) — endpoints, cliente OCR intercambiable, simplificaciones a revisar.
- [`apps/ocr/README.md`](apps/ocr/README.md) — cómo transcribe la planilla con el modelo de visión de Claude y filtra alucinaciones.
- [`docs/database.md`](docs/database.md) — cómo conectarte a Postgres y consultar las tablas (`psql`, cliente gráfico).
- [`docs/images.md`](docs/images.md) — cómo ver las imágenes de planillas subidas (endpoint de la API, volumen/carpeta en disco).
- [`docs/`](docs) — arquitectura, contrato de API, pipeline de visión y roadmap.
