import { BoardMap, BoardPiece } from '../../../core/utils/fen.utils';

export interface PieceMove {
  from: string;
  to: string;
  piece: BoardPiece;
}

export interface PieceAppearance {
  square: string;
  piece: BoardPiece;
}

export interface BoardDiff {
  /** Same piece (type + color) moving from one square to another — animate as a slide, including simple captures. */
  moved: PieceMove[];
  /** A piece showing up with no matching origin (promotion result, or a square filled by a different piece). */
  appeared: PieceAppearance[];
  /** A square that lost its piece with no matching destination (captured piece, or a square emptied outright). */
  disappeared: string[];
}

function samePiece(a: BoardPiece, b: BoardPiece): boolean {
  return a.type === b.type && a.color === b.color;
}

/**
 * Diffs two positions to drive the board's move animation.
 * When exactly one piece "arrives" with no matching square, but an equivalent piece
 * "left" some other square, they're treated as the same piece having moved (this also
 * covers ordinary captures: the captured piece is reported separately in `disappeared`).
 * Anything else (castling, multi-move jumps, promotions) falls back to appeared/disappeared,
 * which fade instead of sliding — a deliberate simplification, not a bug.
 */
export function diffBoards(prev: BoardMap, next: BoardMap): BoardDiff {
  const removed: string[] = [];
  const added: string[] = [];

  for (const [square, piece] of prev) {
    const nextPiece = next.get(square);
    if (!nextPiece || !samePiece(nextPiece, piece)) removed.push(square);
  }
  for (const [square, piece] of next) {
    const prevPiece = prev.get(square);
    if (!prevPiece || !samePiece(prevPiece, piece)) added.push(square);
  }

  if (added.length === 1) {
    const to = added[0];
    const piece = next.get(to)!;
    const matchIdx = removed.findIndex(sq => {
      const p = prev.get(sq);
      return !!p && samePiece(p, piece);
    });
    if (matchIdx !== -1) {
      const from = removed[matchIdx];
      const disappeared = removed.filter((_, i) => i !== matchIdx);
      return { moved: [{ from, to, piece }], appeared: [], disappeared };
    }
  }

  return {
    moved: [],
    appeared: added.map(square => ({ square, piece: next.get(square)! })),
    disappeared: removed,
  };
}
