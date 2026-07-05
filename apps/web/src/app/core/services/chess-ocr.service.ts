import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, throwError, timer } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { OcrMoveResult } from '../models/move.model';

const POLL_INTERVAL_MS = 1000;

interface AnalysisCreated {
  id: string;
  status: 'processing' | 'done' | 'error';
}

interface AnalysisStatusResponse {
  id: string;
  status: 'processing' | 'done' | 'error';
  moves: OcrMoveResult[] | null;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class ChessOcrService {
  private readonly http = inject(HttpClient);

  analyze(imageDataUrl: string): Observable<OcrMoveResult[]> {
    return from(dataUrlToBlob(imageDataUrl)).pipe(
      switchMap((blob) => {
        const formData = new FormData();
        formData.append('image', blob, 'scoresheet.png');
        return this.http.post<AnalysisCreated>(`${environment.apiUrl}/api/v1/analyses`, formData);
      }),
      switchMap(({ id }) => this.pollUntilFinished(id)),
    );
  }

  private pollUntilFinished(id: string): Observable<OcrMoveResult[]> {
    return timer(0, POLL_INTERVAL_MS).pipe(
      switchMap(() =>
        this.http.get<AnalysisStatusResponse>(`${environment.apiUrl}/api/v1/analyses/${id}`),
      ),
      filter((result) => result.status !== 'processing'),
      take(1),
      switchMap((result) => {
        if (result.status === 'error') {
          return throwError(() => new Error(result.error ?? 'El análisis OCR ha fallado'));
        }
        return of(result.moves ?? []);
      }),
    );
  }
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((response) => response.blob());
}
