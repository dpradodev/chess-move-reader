import { ChessMove } from './move.model';

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';
export type OcrStatus = 'idle' | 'processing' | 'done' | 'error';

export interface ChessGame {
  pgn: string;
  moves: ChessMove[];
  fens: string[];
  result: GameResult;
  sourceImage: string | null;
  ocrStatus: OcrStatus;
  currentMoveIndex: number;
}

export const EMPTY_GAME: ChessGame = {
  pgn: '',
  moves: [],
  fens: [],
  result: '*',
  sourceImage: null,
  ocrStatus: 'idle',
  currentMoveIndex: -1,
};
