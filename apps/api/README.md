# apps/api

Backend FastAPI que recibe la planilla subida desde `apps/web`, la guarda junto con
metadatos de la petición en PostgreSQL, y delega el reconocimiento de jugadas a un
cliente OCR intercambiable (`app/ocr_client.py`).

## Desarrollo local

```bash
cd apps/api
python -m venv .venv
.venv/Scripts/activate   # o `source .venv/bin/activate` en Unix
pip install -r requirements.txt

# levantar sólo Postgres desde la raíz del repo
docker compose up -d db

cp ../../.env.example ../../.env   # si no existe ya
uvicorn app.main:app --reload
```

La API queda en `http://localhost:8000` (docs interactivas en `/docs`).

## Endpoints

- `POST /api/v1/analyses` — multipart, campo `image` (PNG/JPG/WEBP, ≤ `MAX_UPLOAD_MB`). Devuelve `{ id, status: "processing" }`.
- `GET /api/v1/analyses/{id}` — `{ id, status, moves, error, created_at, completed_at }`. `moves` sólo viene relleno cuando `status == "done"`.
- `GET /api/v1/analyses/{id}/image` — sirve la imagen original guardada.

## Cliente OCR

`OCR_CLIENT=mock` (por defecto) devuelve una partida de ejemplo fija sin necesidad de
API key, útil para probar el flujo completo sin coste. `OCR_CLIENT=http` delega en el
servicio real de visión (`apps/ocr`) apuntando `OCR_SERVICE_URL` a él — no hace falta
tocar código, solo la variable de entorno y tener `ANTHROPIC_API_KEY` configurada en
`apps/ocr`.

## Simplificaciones deliberadas (a revisar más adelante)

- El job de OCR corre con `BackgroundTasks` de FastAPI (in-process). Si el análisis se
  vuelve pesado o el servicio escala a varios workers, migrar a una cola real (RQ/arq/Celery).
- El esquema se crea con `Base.metadata.create_all()` al arrancar en lugar de Alembic,
  porque el modelo de datos todavía es nuevo e inestable.
