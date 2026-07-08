import { Injectable } from '@angular/core';
import { Observable, of, throwError, timer } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AnalysisCreated, AnalysisStatusResponse, OcrMoveResult } from '../models/analysis.model';

const MOCK_COMPLETE_DELAY_MS = 2200;

// Same Ruy Lopez fixture (with a gap at White's 4th move) used across the whole
// project's mocks -- apps/web's ChessOcrService and apps/ocr's MockOcrClient.
const MOCK_MOVES: OcrMoveResult[] = [
  { san: 'e4', confidence: 98 },
  { san: 'e5', confidence: 95 },
  { san: 'Nf3', confidence: 92 },
  { san: 'Nc6', confidence: 97 },
  { san: 'Bb5', confidence: 89 },
  { san: 'a6', confidence: 85 },
  { san: '', confidence: 0 },
  { san: 'Nf6', confidence: 91 },
  { san: 'O-O', confidence: 72 },
  { san: 'Be7', confidence: 88 },
  { san: 'Re1', confidence: 65 },
  { san: 'b5', confidence: 82 },
  { san: 'Bb3', confidence: 91 },
  { san: 'd6', confidence: 93 },
  { san: 'c3', confidence: 87 },
  { san: 'O-O', confidence: 68 },
  { san: 'h3', confidence: 94 },
  { san: 'Nb8', confidence: 45 },
  { san: 'd4', confidence: 88 },
  { san: 'Nbd7', confidence: 52 },
  { san: 'c4', confidence: 90 },
  { san: 'c6', confidence: 86 },
];

/**
 * Mocked for now -- no real backend call. Shaped like apps/api's real job contract
 * (create returns immediately with status "processing"; poll getAnalysis until
 * "done"/"error") so swapping this for real HTTP later is a body change, not a
 * consumer change. The exact fields here (OcrMoveResult, AnalysisStatusResponse)
 * are expected to change as the real contract firms up -- adjust freely.
 */
@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly jobs = new Map<string, AnalysisStatusResponse>();
  private idCounter = 0;

  createAnalysis(_imageDataUrl: string): Observable<AnalysisCreated> {
    const id = `mock-${++this.idCounter}`;
    this.jobs.set(id, { id, status: 'processing', moves: null, error: null });

    // Simulate the async OCR job finishing in the background, same shape as the
    // real apps/api -> apps/ocr pipeline.
    timer(MOCK_COMPLETE_DELAY_MS).subscribe(() => {
      this.jobs.set(id, { id, status: 'done', moves: MOCK_MOVES, error: null });
    });

    return of({ id, status: 'processing' as const }).pipe(delay(250));
  }

  getAnalysis(id: string): Observable<AnalysisStatusResponse> {
    const job = this.jobs.get(id);
    if (!job) return throwError(() => new Error(`Análisis "${id}" no encontrado`));
    return of(job).pipe(delay(150));
  }
}
