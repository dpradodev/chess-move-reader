import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { OcrMoveResult } from '../models/move.model';

const MOCK_OCR_MOVES: OcrMoveResult[] = [
  { san: 'e4',   confidence: 98 },
  { san: 'e5',   confidence: 95 },
  { san: 'Nf3',  confidence: 92 },
  { san: 'Nc6',  confidence: 97 },
  { san: 'Bb5',  confidence: 89 },
  { san: 'a6',   confidence: 85 },
  { san: '',     confidence: 0  }, // Gap — jugada 4 de blancas (Ba4) no detectada por OCR
  { san: 'Nf6',  confidence: 91 },
  { san: 'O-O',  confidence: 72 },
  { san: 'Be7',  confidence: 88 },
  { san: 'Re1',  confidence: 65 },
  { san: 'b5',   confidence: 82 },
  { san: 'Bb3',  confidence: 91 },
  { san: 'd6',   confidence: 93 },
  { san: 'c3',   confidence: 87 },
  { san: 'O-O',  confidence: 68 },
  { san: 'h3',   confidence: 94 },
  { san: 'Nb8',  confidence: 45 },
  { san: 'd4',   confidence: 88 },
  { san: 'Nbd7', confidence: 52 },
  { san: 'c4',   confidence: 90 },
  { san: 'c6',   confidence: 86 },
];

@Injectable({ providedIn: 'root' })
export class ChessOcrService {
  analyze(_imageDataUrl: string): Observable<OcrMoveResult[]> {
    return of(MOCK_OCR_MOVES).pipe(delay(1500));
  }
}
