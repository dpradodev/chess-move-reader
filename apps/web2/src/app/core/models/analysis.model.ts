export type AnalysisStatus = 'processing' | 'done' | 'error';

/** Matches apps/api's real contract shape ({san, confidence}) on purpose, so swapping
 * the mocked AnalysisService for real HTTP calls later doesn't ripple into consumers. */
export interface OcrMoveResult {
  san: string;
  confidence: number; // 0-100
}

export interface AnalysisCreated {
  id: string;
  status: AnalysisStatus;
}

export interface AnalysisStatusResponse {
  id: string;
  status: AnalysisStatus;
  moves: OcrMoveResult[] | null;
  error: string | null;
}
