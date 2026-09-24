/**
 * Scoresheet (planilla) management: the persisted, per-user game library --
 * metadata (players/tournament/date/round/table/result) + the final corrected move
 * list. Distinct from {@code com.chessmovereader.ocr}'s {@code AnalysisJob}, which
 * is an ephemeral OCR run, not a saved game; a {@code Planilla} may optionally
 * reference the {@code AnalysisJob} it was created from.
 *
 * <p>This is what backs the "Guardar" button and "Mis partidas" screen in
 * apps/web2, both mocked client-side today.
 *
 * <p>Not implemented yet -- see docs/backend-java-architecture.md at the repo root.
 */
package com.chessmovereader.planillas;
