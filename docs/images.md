# Ver las imágenes subidas

Cada planilla subida se guarda en disco en `STORAGE_DIR` (variable de `.env`), con el nombre
`<analysis_id>.<ext>`. La ruta exacta de cada imagen queda en la columna `image_path` de
`analysis_requests` (ver [`docs/database.md`](database.md)).

## Opción rápida: endpoint de la API

La forma más simple es pedirle la imagen a la propia API — sirve el archivo tal cual se guardó:

```
http://localhost:8000/api/v1/analyses/<id>/image
```

Pégalo directamente en el navegador, o con curl:

```bash
curl -o planilla.png http://localhost:8000/api/v1/analyses/<id>/image
```

El `<id>` es el que devuelve `POST /api/v1/analyses` al subir la imagen, o el que ves en la
columna `id` de `analysis_requests`.

## Opción directa: carpeta en disco

- **Corriendo con Docker Compose**: los archivos viven dentro del volumen `uploads` del
  contenedor `api`, montado en `/data/uploads`. Para listarlos o copiarlos a tu máquina:

  ```bash
  docker compose exec api ls -la /data/uploads
  docker compose cp api:/data/uploads/<archivo> ./<archivo>
  ```

- **Corriendo la API en local** (`uvicorn --reload`, sin Docker): los archivos quedan en
  `apps/api/data/uploads/` (o donde apunte `STORAGE_DIR` en tu `.env`), así que puedes abrirlos
  directamente con el explorador de archivos.

## Correlacionar imagen ↔ análisis

```sql
SELECT id, image_filename, image_path, image_content_type, image_size_bytes, status
FROM analysis_requests
ORDER BY created_at DESC
LIMIT 10;
```

`image_path` es la ruta tal como la ve el proceso de la API (dentro del contenedor si corre en
Docker); `image_filename` es el nombre original del archivo que subió el usuario.
