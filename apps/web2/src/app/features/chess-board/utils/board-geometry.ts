import { Orientation } from '../models/board.model';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const SQUARE_PCT = 100 / 8;

function fileIndex(square: string): number {
  return FILES.indexOf(square[0]);
}

function rankOf(square: string): number {
  return Number(square[1]);
}

/** Top-left corner of `square`, in percent of the board's width/height. */
export function squareTopLeftPercent(square: string, orientation: Orientation): { left: number; top: number } {
  const file = fileIndex(square);
  const rank = rankOf(square);
  const col = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 8 - rank : rank - 1;
  return { left: col * SQUARE_PCT, top: row * SQUARE_PCT };
}

/** Center of `square`, in percent of the board's width/height — used to anchor arrows/circles. */
export function squareCenterPercent(square: string, orientation: Orientation): { x: number; y: number } {
  const { left, top } = squareTopLeftPercent(square, orientation);
  return { x: left + SQUARE_PCT / 2, y: top + SQUARE_PCT / 2 };
}

/** Square under a viewport point, or null if the point falls outside the board. */
export function squareFromPoint(
  clientX: number,
  clientY: number,
  boardRect: DOMRect,
  orientation: Orientation,
): string | null {
  const relX = clientX - boardRect.left;
  const relY = clientY - boardRect.top;
  if (relX < 0 || relY < 0 || relX >= boardRect.width || relY >= boardRect.height) return null;

  const col = Math.floor((relX / boardRect.width) * 8);
  const row = Math.floor((relY / boardRect.height) * 8);
  const file = orientation === 'white' ? col : 7 - col;
  const rank = orientation === 'white' ? 8 - row : row + 1;
  if (file < 0 || file > 7 || rank < 1 || rank > 8) return null;

  return `${FILES[file]}${rank}`;
}
