const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export type BoardPiece = { type: string; color: 'w' | 'b' };
export type BoardMap = Map<string, BoardPiece>;

export function parseFen(fen: string): BoardMap {
  const map = new Map<string, BoardPiece>();
  const boardPart = fen.split(' ')[0];

  boardPart.split('/').forEach((rank, rankIdx) => {
    let fileIdx = 0;
    for (const char of rank) {
      if (/\d/.test(char)) {
        fileIdx += parseInt(char, 10);
      } else {
        const square = `${FILES[fileIdx]}${8 - rankIdx}`;
        map.set(square, {
          type: char.toLowerCase(),
          color: char === char.toUpperCase() ? 'w' : 'b',
        });
        fileIdx++;
      }
    }
  });

  return map;
}
