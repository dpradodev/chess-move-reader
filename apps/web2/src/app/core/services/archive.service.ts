import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ALL_RESULTS, ALL_TOURNAMENTS, ArchiveFilters, ArchiveGame } from '../models/archive-game.model';

const MOCK_DELAY_MS = 350;

// Same demo dataset as design/src/app/App.tsx's ARCHIVE_GAMES.
const MOCK_GAMES: ArchiveGame[] = [
  { id: 'g1', white: 'Magnus Carlsen', black: 'Fabiano Caruana', date: '2024-11-14', tournament: 'World Championship 2024', result: '1-0', moves: 47 },
  { id: 'g2', white: 'Hikaru Nakamura', black: 'Ian Nepomniachtchi', date: '2024-11-10', tournament: 'World Championship 2024', result: '½-½', moves: 32 },
  { id: 'g3', white: 'Ding Liren', black: 'Magnus Carlsen', date: '2024-10-05', tournament: 'Grand Chess Tour Paris', result: '0-1', moves: 63 },
  { id: 'g4', white: 'Alireza Firouzja', black: 'Wesley So', date: '2024-09-20', tournament: 'Sinquefield Cup', result: '1-0', moves: 41 },
  { id: 'g5', white: 'Viswanathan Anand', black: 'Levon Aronian', date: '2024-08-15', tournament: 'Legends of Chess', result: '½-½', moves: 28 },
  { id: 'g6', white: 'Gukesh D', black: 'Praggnanandhaa R', date: '2024-07-22', tournament: 'Tata Steel India', result: '1-0', moves: 55 },
];

function matches(game: ArchiveGame, filters: ArchiveFilters): boolean {
  if (filters.search) {
    const q = filters.search.toLowerCase();
    if (!game.white.toLowerCase().includes(q) && !game.black.toLowerCase().includes(q)) return false;
  }
  if (filters.tournament && filters.tournament !== ALL_TOURNAMENTS && game.tournament !== filters.tournament) return false;
  if (filters.result && filters.result !== ALL_RESULTS && game.result !== filters.result) return false;
  if (filters.dateFrom && game.date < filters.dateFrom) return false;
  if (filters.dateTo && game.date > filters.dateTo) return false;
  return true;
}

/**
 * Mocked for now -- no real backend endpoint exists yet (apps/api only manages
 * loose analyses, not a per-user game library; see apps/web2/README.md). Filtering
 * happens *inside* this service, not in ArchivePage, so the component always talks
 * to it the same way a real HTTP call would work later: send filters, get back an
 * already-filtered list -- swapping the body for `http.get(...)` won't change the
 * page. Individual games don't carry their move list yet (only metadata + a move
 * count), so "Ver" just opens a blank editor for now, same as the demo shortcut.
 */
@Injectable({ providedIn: 'root' })
export class ArchiveService {
  listGames(filters: ArchiveFilters = {}): Observable<ArchiveGame[]> {
    return of(MOCK_GAMES.filter(g => matches(g, filters))).pipe(delay(MOCK_DELAY_MS));
  }
}
