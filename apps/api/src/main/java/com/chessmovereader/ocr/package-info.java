/**
 * OCR orchestration: the {@code ScoresheetOcrProvider} abstraction ("give me an
 * image, get back a move list") plus the {@code AnalysisJob} entity/endpoints that
 * drive the upload -&gt; async OCR call -&gt; poll-until-done flow.
 *
 * <p>{@code ScoresheetOcrProvider} will have two implementations: a mock (fixed
 * fixture, no external call) and an HTTP client delegating to apps/ocr (the
 * Python/Claude-vision microservice, kept as-is -- see the architecture doc for
 * why that logic stays in Python rather than being reimplemented here).
 *
 * <p>Not implemented yet -- see docs/backend-java-architecture.md at the repo root.
 */
package com.chessmovereader.ocr;
