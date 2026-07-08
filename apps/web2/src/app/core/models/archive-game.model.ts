export type ArchiveResult = '1-0' | '0-1' | '½-½';

export interface ArchiveGame {
  id: string;
  white: string;
  black: string;
  date: string; // ISO yyyy-mm-dd
  tournament: string;
  result: ArchiveResult;
  moves: number;
}

/** Sent to ArchiveService.listGames() -- simulates server-side filtering (a real
 * "list my games" endpoint would take query params like these, not return
 * everything for the client to filter). */
export interface ArchiveFilters {
  search?: string;
  tournament?: string;
  result?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const ALL_TOURNAMENTS = 'All Tournaments';
export const ALL_RESULTS = 'Todos';

export const TOURNAMENTS = [
  ALL_TOURNAMENTS,
  'World Championship 2024',
  'Grand Chess Tour Paris',
  'Sinquefield Cup',
  'Legends of Chess',
  'Tata Steel India',
];

export const RESULT_FILTERS = [ALL_RESULTS, '1-0', '0-1', '½-½'];
