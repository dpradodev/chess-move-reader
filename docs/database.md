# Ver la base de datos

Postgres corre en el contenedor `db` de `docker-compose.yml`, expuesto en `localhost:5432`.
Credenciales y nombre de la base están en `.env` (copiado de `.env.example`):

```
POSTGRES_USER=chess
POSTGRES_PASSWORD=chess
POSTGRES_DB=chess_move_reader
```

Requiere `docker compose up -d db` (o `docker compose up -d`) corriendo.

## Opción rápida: psql dentro del contenedor

No hace falta tener `psql` instalado en tu máquina:

```bash
docker compose exec db psql -U chess -d chess_move_reader
```

Comandos útiles una vez dentro:

```sql
\dt                                          -- listar tablas
\d analysis_requests                         -- describir una tabla
SELECT id, status, image_filename, moves_detected_count, moves_gap_count, avg_confidence, created_at
FROM analysis_requests
ORDER BY created_at DESC
LIMIT 10;

SELECT * FROM analysis_moves WHERE analysis_request_id = '<uuid>' ORDER BY ply_index;
```

Salir con `\q`.

## Opción con cliente gráfico

Con cualquier cliente (DBeaver, TablePlus, pgAdmin, la extensión "PostgreSQL" de VS Code, etc.)
usa esta conexión:

| Campo     | Valor               |
|-----------|----------------------|
| Host      | `localhost`          |
| Puerto    | `5432`               |
| Base      | `chess_move_reader`  |
| Usuario   | `chess`              |
| Password  | `chess`              |

## Desde fuera de Docker (API corriendo con `uvicorn --reload`)

Si corres la API en local (no en el contenedor `api`), usa la misma `DATABASE_URL` de `.env`:

```
postgresql+psycopg://chess:chess@localhost:5432/chess_move_reader
```

## Tablas relevantes

- `analysis_requests` — una fila por petición de análisis: estado, ruta de la imagen guardada,
  IP/user-agent, y agregados (`moves_detected_count`, `moves_gap_count`, `avg_confidence`).
- `analysis_moves` — jugadas devueltas por el OCR para cada `analysis_requests.id`, en orden (`ply_index`).
