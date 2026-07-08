import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ArchiveService } from '../../core/services/archive.service';
import { ALL_RESULTS, ALL_TOURNAMENTS, ArchiveGame, RESULT_FILTERS, TOURNAMENTS } from '../../core/models/archive-game.model';
import { DatePickerComponent } from '../../shared/components/ui/date-picker/date-picker.component';
import { SpinnerComponent } from '../../shared/components/ui/spinner/spinner.component';

function resultClasses(result: ArchiveGame['result']): string {
  if (result === '1-0') return 'text-emerald-400 bg-emerald-950/60 border border-emerald-700/40';
  if (result === '0-1') return 'text-red-400 bg-red-950/60 border border-red-700/40';
  return 'text-muted-foreground bg-white/5 border border-white/10';
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Ported from design/src/app/App.tsx (ArchiveScreen). Filtering happens server-side
 * (ArchiveService.listGames(filters)) instead of client-side over a full in-memory
 * array like the React prototype -- see the service for why. "Ver" opens the editor
 * blank (same as scan's demo shortcut): mock games don't carry a move list yet, only
 * metadata + a move count, so there's nothing real to load into GameStateService.
 */
@Component({
  selector: 'app-archive-page',
  imports: [FormsModule, DatePickerComponent, SpinnerComponent],
  template: `
    <div class="min-h-full p-6" style="font-family: var(--font-body)">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-foreground" style="font-family: var(--font-display)">Mis partidas</h2>
          <p class="mt-0.5 text-sm text-muted-foreground">
            {{ games().length }} partida{{ games().length !== 1 ? 's' : '' }}
          </p>
        </div>
        <button
          type="button"
          (click)="showFilters.set(!showFilters())"
          class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all"
          [class]="showFilters() ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filtros
        </button>
      </div>

      <!-- Filter bar -->
      <div class="mb-6 flex flex-col gap-3">
        <!-- Search -->
        <div class="relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar jugador…"
            [ngModel]="search()"
            (ngModelChange)="onSearchInput($event)"
            class="w-full rounded-xl border border-border bg-input-background py-2.5 pl-9 pr-4 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        <!-- Result tabs -->
        <div class="flex items-center gap-2">
          @for (r of resultFilters; track r) {
            <button
              type="button"
              (click)="setResult(r)"
              class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
              [class]="result() === r ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'"
              style="font-family: var(--font-notation)"
            >
              {{ r }}
            </button>
          }
        </div>

        <!-- Advanced filters -->
        @if (showFilters()) {
          <div class="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs uppercase tracking-wider text-muted-foreground">Torneo</label>
              <select
                [ngModel]="tournament()"
                (ngModelChange)="setTournament($event)"
                class="rounded-lg border border-border bg-input-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                @for (t of tournaments; track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs uppercase tracking-wider text-muted-foreground">Desde</label>
              <app-date-picker [ngModel]="dateFrom()" (ngModelChange)="setDateFrom($event)" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs uppercase tracking-wider text-muted-foreground">Hasta</label>
              <app-date-picker [ngModel]="dateTo()" (ngModelChange)="setDateTo($event)" />
            </div>
            @if (tournament() !== allTournaments || dateFrom() || dateTo()) {
              <button
                type="button"
                (click)="clearAdvanced()"
                class="flex items-center gap-1 self-end rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 18L18 6M6 6l12 12" /></svg>
                Limpiar
              </button>
            }
          </div>
        }
      </div>

      <!-- Games grid -->
      @if (loading()) {
        <div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <app-spinner size="lg" />
          <p class="text-sm text-muted-foreground">Cargando partidas…</p>
        </div>
      } @else if (games().length === 0) {
        <div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div class="text-4xl opacity-30">♜</div>
          <p class="text-sm text-muted-foreground">No se encontraron partidas</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (game of games(); track game.id) {
            <div class="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-card/80">
              <!-- Players -->
              <div class="flex items-start justify-between gap-2">
                <div class="flex min-w-0 flex-col gap-2">
                  <div class="flex items-center gap-1.5">
                    <span class="shrink-0 rounded border border-board-light/20 bg-board-light/10 px-1 py-0.5 font-mono text-[10px] text-board-light">W</span>
                    <span class="truncate text-sm font-semibold text-foreground">{{ game.white }}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="shrink-0 rounded border border-board-dark/20 bg-board-dark/10 px-1 py-0.5 font-mono text-[10px] text-board-dark">B</span>
                    <span class="truncate text-sm font-semibold text-foreground">{{ game.black }}</span>
                  </div>
                </div>
                <span class="shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold" [class]="resultClasses(game.result)" style="font-family: var(--font-notation)">
                  {{ game.result }}
                </span>
              </div>

              <!-- Meta -->
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                <span class="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                  {{ game.tournament }}
                </span>
                <span class="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {{ formatDate(game.date) }}
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-xs text-muted-foreground">{{ game.moves }} jugadas</span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="openEditor()"
                    class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                    Ver
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Descargar PGN de partidas guardadas -- todavía no disponible"
                    class="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground/40"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    PGN
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ArchivePage implements OnDestroy {
  private readonly archive = inject(ArchiveService);
  private readonly router = inject(Router);

  protected readonly tournaments = TOURNAMENTS;
  protected readonly resultFilters = RESULT_FILTERS;
  protected readonly allTournaments = ALL_TOURNAMENTS;
  protected readonly resultClasses = resultClasses;
  protected readonly formatDate = formatDate;

  readonly search = signal('');
  readonly tournament = signal(ALL_TOURNAMENTS);
  readonly result = signal(ALL_RESULTS);
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly showFilters = signal(false);

  readonly games = signal<ArchiveGame[]>([]);
  readonly loading = signal(true);

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$.pipe(debounceTime(250)).subscribe(value => {
      this.search.set(value);
      this.fetchGames();
    });
    this.fetchGames();
  }

  ngOnDestroy(): void {
    this.searchInput$.complete();
  }

  onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  setResult(value: string): void {
    this.result.set(value);
    this.fetchGames();
  }

  setTournament(value: string): void {
    this.tournament.set(value);
    this.fetchGames();
  }

  setDateFrom(value: string): void {
    this.dateFrom.set(value);
    this.fetchGames();
  }

  setDateTo(value: string): void {
    this.dateTo.set(value);
    this.fetchGames();
  }

  clearAdvanced(): void {
    this.tournament.set(ALL_TOURNAMENTS);
    this.dateFrom.set('');
    this.dateTo.set('');
    this.fetchGames();
  }

  openEditor(): void {
    this.router.navigateByUrl('/editor');
  }

  private fetchGames(): void {
    this.loading.set(true);
    this.archive
      .listGames({
        search: this.search(),
        tournament: this.tournament(),
        result: this.result(),
        dateFrom: this.dateFrom(),
        dateTo: this.dateTo(),
      })
      .subscribe(games => {
        this.games.set(games);
        this.loading.set(false);
      });
  }
}
