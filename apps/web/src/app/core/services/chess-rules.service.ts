import { Injectable } from '@angular/core';
import { Chess, Square } from 'chess.js';

@Injectable({ providedIn: 'root' })
export class ChessRulesService {
  /** Legal destination squares for the piece on `square`, or an empty set if there is none / the FEN is invalid. */
  legalDestinations(fen: string, square: string): Set<string> {
    try {
      const moves = new Chess(fen).moves({ square: square as Square, verbose: true });
      return new Set(moves.map(m => m.to));
    } catch {
      return new Set();
    }
  }

  /** True when moving the piece on `from` to `to` requires a promotion choice (pawn reaching the last rank). */
  needsPromotion(fen: string, from: string, to: string): boolean {
    try {
      const piece = new Chess(fen).get(from as Square);
      if (!piece || piece.type !== 'p') return false;
      return to[1] === '8' || to[1] === '1';
    } catch {
      return false;
    }
  }

  isCheck(fen: string): boolean {
    try {
      return new Chess(fen).isCheck();
    } catch {
      return false;
    }
  }

  /** Square of the king of `color`, or null if the FEN is invalid (should not happen for a legal position). */
  kingSquare(fen: string, color: 'w' | 'b'): string | null {
    try {
      const board = new Chess(fen).board();
      for (const row of board) {
        for (const cell of row) {
          if (cell && cell.type === 'k' && cell.color === color) return cell.square;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}
