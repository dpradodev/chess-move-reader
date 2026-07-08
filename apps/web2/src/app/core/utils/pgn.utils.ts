import { GameMeta } from '../models/game-meta.model';
import { GameResult } from '../models/game.model';

/** "½-½" reads better in the UI dropdown; the PGN spec wants the ASCII "1/2-1/2". */
export function metaResultToGameResult(result: GameMeta['result']): GameResult {
  return result === '½-½' ? '1/2-1/2' : result;
}

/** [Event]/[Site]/[Date]/[Round]/[White]/[Black]/[Result] tags, "?" for anything unfilled. */
export function buildPgnHeader(meta: GameMeta): string {
  const tags = [
    `[Event "${meta.tournament || '?'}"]`,
    `[Site "${meta.table ? `Mesa ${meta.table}` : '?'}"]`,
    `[Date "${meta.date ? meta.date.replace(/-/g, '.') : '????.??.??'}"]`,
    `[Round "${meta.round || '?'}"]`,
    `[White "${meta.white || '?'}"]`,
    `[Black "${meta.black || '?'}"]`,
    `[Result "${metaResultToGameResult(meta.result)}"]`,
  ];
  return tags.join('\n') + '\n\n';
}

/** Filename for the .pgn download, e.g. "Carlsen_vs_Caruana.pgn" -- falls back when names are blank. */
export function buildPgnFilename(meta: GameMeta): string {
  const surname = (name: string) => name.trim().split(/\s+/).pop();
  const white = surname(meta.white);
  const black = surname(meta.black);
  return white && black ? `${white}_vs_${black}.pgn` : 'partida.pgn';
}
