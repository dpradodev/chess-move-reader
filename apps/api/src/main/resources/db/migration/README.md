# Flyway migrations

Empty on purpose -- no schema exists yet. First migration should be
`V1__create_users.sql`, following the versioned-migration naming Flyway expects
(`V<version>__<description>.sql`, applied in order, never edited once merged).

See `docs/backend-java-architecture.md` at the repo root for the planned schema
(`users`, `analysis_jobs`, `analysis_job_moves`, `planillas`, `planilla_moves`).
