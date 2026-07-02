export type Color = 'white' | 'black';

export type MoveStatus =
  | 'validated'   // confirmed by chess.js in the correct positional sequence
  | 'manual'      // entered or corrected by the user (confidence always 100)
  | 'inferred'    // auto-filled because only one legal move leads to the next known notation
  | 'unvalidated' // OCR detected notation but position is unknown (after a gap)
  | 'gap';        // move was not detected by OCR; position is unknown

export interface OcrMoveResult {
  san: string;        // '' if not detected by OCR
  confidence: number; // 0–100; 0 if not detected
}

export interface ChessMove {
  notation: string;  // '' when status is 'gap' (or invalid OCR that could not be inferred)
  color: Color;
  moveNumber: number;
  from: string;      // '' when status is 'gap' or 'unvalidated'
  to: string;        // '' when status is 'gap' or 'unvalidated'
  confidence: number;
  status: MoveStatus;
}

export interface MovePair {
  moveNumber: number;
  white: ChessMove;
  black?: ChessMove;
}
