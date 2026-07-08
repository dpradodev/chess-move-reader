/** Editor-only metadata, not detected by OCR -- the user fills it in by hand. */
export interface GameMeta {
  white: string;
  black: string;
  tournament: string;
  date: string; // yyyy-mm-dd, matches <input type="date">
  result: '1-0' | '0-1' | '½-½' | '*';
  round: string;
  table: string;
}

export const EMPTY_META: GameMeta = {
  white: '',
  black: '',
  tournament: '',
  date: '',
  result: '*',
  round: '',
  table: '',
};
