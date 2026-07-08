import { Injectable, signal, computed } from '@angular/core';
import { Chess } from 'chess.js';
import { ChessGame, EMPTY_GAME, GameResult, OcrStatus } from '../models/game.model';
import { ChessMove, Color, OcrMoveResult } from '../models/move.model';
import { parseFen } from '../utils/fen.utils';

const INITIAL_FEN = new Chess().fen();

// Returns the single legal move from `fen` that allows `nextSan` to be played immediately after,
// or null if zero or multiple such moves exist.
function tryInferMove(fen: string, nextSan: string): string | null {
  const legalMoves = new Chess(fen).moves({ verbose: true }) as Array<{ san: string }>;
  const candidates: string[] = [];
  for (const lm of legalMoves) {
    try {
      const test = new Chess(fen);
      test.move(lm.san);
      test.move(nextSan);
      candidates.push(lm.san);
      if (candidates.length > 1) return null;
    } catch {
      // nextSan not legal after lm.san
    }
  }
  return candidates.length === 1 ? candidates[0] : null;
}

// Re-validates moves starting at `startIndex` against the position in `fens[startIndex]`.
// Truncates fens to startIndex+1 entries first, then extends with each successfully validated move.
// Stops at the first gap or invalid notation; marks those and all subsequent non-gap moves as 'unvalidated'.
function revalidateSegmentFrom(
  startIndex: number,
  moves: readonly ChessMove[],
  fens: readonly string[],
): { moves: ChessMove[]; fens: string[] } {
  if (fens.length <= startIndex) {
    return { moves: [...moves], fens: [...fens] };
  }
  const newFens: string[] = [...fens.slice(0, startIndex + 1)];
  const newMoves: ChessMove[] = [...moves];
  let chess = new Chess(newFens[startIndex]);
  let validating = true;

  for (let i = startIndex; i < moves.length; i++) {
    const move = moves[i];

    if (!validating) {
      if (move.status !== 'gap' && move.notation.trim()) {
        newMoves[i] = { ...move, status: 'unvalidated', from: '', to: '' };
      }
      continue;
    }

    if (move.status === 'gap' || !move.notation.trim()) {
      validating = false;
      continue;
    }

    let result;
    try {
      result = chess.move(move.notation);
    } catch {
      newMoves[i] = { ...move, status: 'unvalidated', from: '', to: '' };
      validating = false;
      continue;
    }
    if (!result) {
      newMoves[i] = { ...move, status: 'unvalidated', from: '', to: '' };
      validating = false;
      continue;
    }

    newFens.push(result.after);
    newMoves[i] = {
      ...move,
      notation: result.san,
      from: result.from,
      to: result.to,
      status: move.status === 'unvalidated' ? 'validated' : move.status,
    };
    chess = new Chess(result.after);
  }

  return { moves: newMoves, fens: newFens };
}

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly _game = signal<ChessGame>({ ...EMPTY_GAME, fens: [INITIAL_FEN] });

  readonly game = this._game.asReadonly();
  readonly moves = computed(() => this._game().moves);
  readonly currentMoveIndex = computed(() => this._game().currentMoveIndex);
  readonly ocrStatus = computed(() => this._game().ocrStatus);
  readonly sourceImage = computed(() => this._game().sourceImage);

  /** Number of consecutively validated/inferred/manual moves from the start (= fens.length - 1). */
  readonly validatedMoveCount = computed(() => this._game().fens.length - 1);

  /**
   * The move index the board actually reflects — clamped to the last validated position.
   * When the sheet cursor is past a gap the board stays at the last known position.
   */
  readonly currentBoardMoveIndex = computed(() => {
    const idx = this._game().currentMoveIndex;
    const maxValid = this.validatedMoveCount() - 1;
    return Math.min(idx, maxValid);
  });

  /** True when the sheet cursor is pointing at or past the first gap. */
  readonly isBoardFrozen = computed(() => {
    const idx = this._game().currentMoveIndex;
    return idx >= this.validatedMoveCount();
  });

  /** Formatted label for the first gap in the list, e.g. "4." or "5...". */
  readonly firstGapLabel = computed(() => {
    const gap = this._game().moves.find(m => m.status === 'gap');
    if (!gap) return null;
    return gap.color === 'white' ? `${gap.moveNumber}.` : `${gap.moveNumber}...`;
  });

  readonly currentFen = computed(() => {
    const { fens } = this._game();
    const boardIdx = this.currentBoardMoveIndex();
    return fens[boardIdx + 1] ?? fens[0] ?? INITIAL_FEN;
  });

  readonly currentBoard = computed(() => parseFen(this.currentFen()));

  readonly lastMoveSquares = computed<[string, string] | null>(() => {
    const { moves } = this._game();
    const boardIdx = this.currentBoardMoveIndex();
    const move = moves[boardIdx];
    return move?.from && move?.to ? [move.from, move.to] : null;
  });

  readonly activeColor = computed<'w' | 'b'>(() => {
    return (this.currentFen().split(' ')[1] ?? 'w') as 'w' | 'b';
  });

  readonly pgn = computed<string>(() => {
    const moves = this._game().moves;
    if (moves.length === 0) return '';
    const parts: string[] = [];
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const isWhite = i % 2 === 0;
      if (isWhite) parts.push(`${move.moveNumber}.`);
      parts.push(move.status === 'gap' || !move.notation.trim() ? '--' : move.notation);
    }
    const result = this._game().result;
    if (result !== '*') parts.push(result);
    return parts.join(' ');
  });

  setSourceImage(dataUrl: string): void {
    this._game.update(g => ({ ...g, sourceImage: dataUrl }));
  }

  setOcrStatus(status: OcrStatus): void {
    this._game.update(g => ({ ...g, ocrStatus: status }));
  }

  /** Sets the game's final result (shown in the move list PGN footer via `pgn()`). */
  setResult(result: GameResult): void {
    this._game.update(g => ({ ...g, result }));
  }

  /**
   * Loads OCR results, validating moves sequentially.
   * - Empty or invalid OCR notation → gap (inference attempted first)
   * - Moves after the first gap → unvalidated (notation preserved for user review)
   */
  loadOcrMoves(ocrMoves: OcrMoveResult[]): void {
    const chess = new Chess();
    const fens: string[] = [chess.fen()];
    const moves: ChessMove[] = [];
    let hitGap = false;

    for (let i = 0; i < ocrMoves.length; i++) {
      const { san, confidence } = ocrMoves[i];
      const color: Color = i % 2 === 0 ? 'white' : 'black';
      const moveNumber = Math.floor(i / 2) + 1;

      if (hitGap) {
        moves.push({
          notation: san,
          color,
          moveNumber,
          from: '',
          to: '',
          confidence,
          status: san.trim() ? 'unvalidated' : 'gap',
        });
        continue;
      }

      // Try to validate the current OCR move
      let result = null;
      if (san.trim()) {
        try { result = chess.move(san); } catch { result = null; }
      }

      if (result) {
        fens.push(result.after);
        moves.push({
          notation: result.san,
          color,
          moveNumber,
          from: result.from,
          to: result.to,
          confidence,
          status: 'validated',
        });
        continue;
      }

      // Validation failed or empty — try single-step inference via the next known notation
      const nextKnownSan = ocrMoves.slice(i + 1).find(m => m.san.trim())?.san ?? '';
      const inferred = nextKnownSan ? tryInferMove(chess.fen(), nextKnownSan) : null;

      if (inferred) {
        const infResult = chess.move(inferred)!;
        fens.push(infResult.after);
        moves.push({
          notation: infResult.san,
          color,
          moveNumber,
          from: infResult.from,
          to: infResult.to,
          confidence: 85,
          status: 'inferred',
        });
      } else {
        // True gap — keep any OCR notation as a hint for the user
        moves.push({
          notation: san.trim(),
          color,
          moveNumber,
          from: '',
          to: '',
          confidence: san.trim() ? confidence : 0,
          status: 'gap',
        });
        hitGap = true;
      }
    }

    this._game.update(g => ({
      ...g,
      moves,
      fens,
      ocrStatus: 'done',
      currentMoveIndex: moves.length > 0 ? 0 : -1,
    }));
  }

  /**
   * Makes a move on the board from the current board position (gap-aware).
   * Preserves subsequent moves and attempts cascade revalidation.
   */
  makeMove(from: string, to: string, promotion = 'q'): boolean {
    const { fens, moves } = this._game();
    const boardIdx = this.currentBoardMoveIndex();
    const fenAtPos = fens[boardIdx + 1] ?? fens[0];

    const chess = new Chess(fenAtPos);
    let result;
    try {
      result = chess.move({ from, to, promotion });
    } catch {
      return false;
    }
    if (!result) return false;

    const newMoveIdx = boardIdx + 1;
    const newMove: ChessMove = {
      notation: result.san,
      color: result.color === 'w' ? 'white' : 'black',
      moveNumber: Math.floor(newMoveIdx / 2) + 1,
      from: result.from,
      to: result.to,
      confidence: 100,
      status: 'manual',
    };

    const updatedMoves: ChessMove[] = [
      ...moves.slice(0, newMoveIdx),
      newMove,
      ...moves.slice(newMoveIdx + 1),
    ];
    const baseFens: string[] = [...fens.slice(0, boardIdx + 2), result.after];

    const { moves: finalMoves, fens: finalFens } = revalidateSegmentFrom(
      newMoveIdx + 1, updatedMoves, baseFens,
    );

    this._game.update(g => ({
      ...g,
      moves: finalMoves,
      fens: finalFens,
      currentMoveIndex: newMoveIdx,
    }));

    return true;
  }

  /**
   * Updates the notation of an existing move (OCR correction or gap fill).
   * Validates with chess.js from the known position, then triggers cascade revalidation.
   * Returns false if the notation is invalid or the move's position is unknown.
   */
  updateMoveNotation(index: number, notation: string): boolean {
    const { fens, moves } = this._game();
    const fenBefore = fens[index];
    if (fenBefore === undefined) return false;

    const chess = new Chess(fenBefore);
    let result;
    try {
      result = chess.move(notation);
    } catch {
      return false;
    }
    if (!result) return false;

    const updatedMove: ChessMove = {
      ...moves[index],
      notation: result.san,
      from: result.from,
      to: result.to,
      confidence: 100,
      status: 'manual',
    };

    const updatedMoves: ChessMove[] = [...moves];
    updatedMoves[index] = updatedMove;
    const baseFens: string[] = [...fens.slice(0, index + 1), result.after];

    const { moves: finalMoves, fens: finalFens } = revalidateSegmentFrom(
      index + 1, updatedMoves, baseFens,
    );

    this._game.update(g => ({ ...g, moves: finalMoves, fens: finalFens }));
    return true;
  }

  goToMove(index: number): void {
    const max = this._game().moves.length - 1;
    this._game.update(g => ({
      ...g,
      currentMoveIndex: Math.max(-1, Math.min(max, index)),
    }));
  }

  goToStart(): void { this.goToMove(-1); }
  goToEnd(): void { this.goToMove(this._game().moves.length - 1); }
  stepBack(): void { this.goToMove(this._game().currentMoveIndex - 1); }
  stepForward(): void { this.goToMove(this._game().currentMoveIndex + 1); }

  reset(): void {
    this._game.set({ ...EMPTY_GAME, fens: [INITIAL_FEN] });
  }
}
