import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GameStateService } from '../../core/services/game-state.service';
import { ChessRulesService } from '../../core/services/chess-rules.service';
import { AnalysisService } from '../../core/services/analysis.service';
import { EMPTY_META, GameMeta } from '../../core/models/game-meta.model';
import { buildPgnFilename, buildPgnHeader, metaResultToGameResult } from '../../core/utils/pgn.utils';
import { BoardComponent } from '../../features/chess-board/components/board/board.component';
import { BoardControlsComponent } from '../../features/chess-board/components/board-controls/board-controls.component';
import { BoardMoveAttempt, Orientation } from '../../features/chess-board/models/board.model';
import { MoveListComponent } from '../../features/move-list/components/move-list/move-list.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { DatePickerComponent } from '../../shared/components/ui/date-picker/date-picker.component';

/**
 * Editor screen: real interactive board (ported from apps/web's premium
 * features/chess-board, recolored to the dark/gold theme -- see that folder's
 * components) + a move list wired to the same GameStateService state machine,
 * plus the game metadata form (players/tournament/date/round/table/result) that
 * feeds the PGN header tags. Ported from design/src/app/App.tsx's EditorScreen.
 * The shared NavBar comes from ShellComponent (app.routes.ts) -- this page only
 * owns the board/move-list content area.
 *
 * Metadata is editor-local only (not part of AnalysisService's mock contract --
 * OCR never detects player names/tournament/etc, the design's own demo data
 * confirms this is hand-entered) so no backend contract needed adapting for it.
 */
@Component({
  selector: 'app-editor-page',
  imports: [BoardComponent, BoardControlsComponent, MoveListComponent, ButtonComponent, DatePickerComponent, FormsModule],
  template: `
    <div class="flex h-full flex-col bg-background" style="font-family: var(--font-body)">
      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <!-- Board -->
        <section
          class="flex min-h-0 shrink-0 flex-col items-center justify-start gap-4 border-b border-border px-4 pb-4 pt-4
                 lg:flex-1 lg:justify-center lg:border-b-0 lg:border-r lg:p-6"
          aria-label="Tablero"
        >
          <!--
            Mobile: simple, capped at 480px (width is the only scarce dimension, the
            page just scrolls). Desktop: board-fit becomes a flex-grow item that fills
            all leftover vertical space in the column, and board-square sizes itself
            to min(container width, container height) via container query units, so
            the board grows in *both* directions to use whichever dimension is tighter
            without ever overflowing the section.
          -->
          <div class="board-fit flex items-center justify-center">
            <div class="board-square w-full">
              <app-board
                [fen]="gameState.currentFen()"
                [orientation]="orientation()"
                [lastMove]="gameState.lastMoveSquares()"
                [checkSquare]="checkSquare()"
                (moveMade)="onMoveMade($event)"
              />
            </div>
          </div>

          <app-board-controls
            [atStart]="gameState.currentMoveIndex() < 0"
            [atEnd]="gameState.currentMoveIndex() >= gameState.moves().length - 1"
            [label]="controlLabel()"
            (goStart)="gameState.goToStart()"
            (stepBack)="gameState.stepBack()"
            (stepForward)="gameState.stepForward()"
            (goEnd)="gameState.goToEnd()"
            (flip)="toggleOrientation()"
          />

          @if (gameState.isBoardFrozen()) {
            <div class="flex w-full max-w-120 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive lg:max-w-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Tablero pausado — rellena la jugada <strong>{{ gameState.firstGapLabel() }}</strong> para continuar</span>
            </div>
          }
        </section>

        <!-- Move list + actions -->
        <aside class="flex w-full min-h-0 flex-1 flex-col overflow-hidden lg:w-96" aria-label="Movimientos">
          <!-- Game metadata -->
          <div class="shrink-0 border-b border-border bg-card/50">
            <!-- Mobile toggle header -->
            <button
              type="button"
              (click)="metaOpen.set(!metaOpen())"
              class="flex w-full items-center justify-between px-4 py-3 text-xs text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              <span class="flex min-w-0 items-center gap-2">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span class="max-w-[180px] truncate font-medium text-foreground">{{ meta.white || 'Blancas' }} — {{ meta.black || 'Negras' }}</span>
                @if (meta.result !== '*') {
                  <span class="text-primary" style="font-family: var(--font-notation)">{{ meta.result }}</span>
                }
              </span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="shrink-0 transition-transform duration-200" [class.rotate-180]="metaOpen()">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <div [class]="(metaOpen() ? 'flex' : 'hidden') + ' flex-col gap-3 p-4 lg:flex'">
              <!-- Players + result -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                  <label class="text-[10px] uppercase tracking-wider text-muted-foreground">Blancas</label>
                  <input
                    [(ngModel)]="meta.white"
                    placeholder="Jugador blancas"
                    class="w-full truncate border-b border-border bg-transparent text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
                <div class="flex shrink-0 flex-col items-center gap-1 px-1">
                  <label class="text-[10px] uppercase tracking-wider text-muted-foreground">Resultado</label>
                  <select
                    [ngModel]="meta.result"
                    (ngModelChange)="onResultChange($event)"
                    class="cursor-pointer bg-transparent text-center text-sm font-bold text-primary outline-none"
                    style="font-family: var(--font-notation)"
                  >
                    <option value="1-0">1-0</option>
                    <option value="0-1">0-1</option>
                    <option value="½-½">½-½</option>
                    <option value="*">*</option>
                  </select>
                </div>
                <div class="flex min-w-0 flex-1 flex-col items-end gap-1">
                  <label class="text-[10px] uppercase tracking-wider text-muted-foreground">Negras</label>
                  <input
                    [(ngModel)]="meta.black"
                    placeholder="Jugador negras"
                    class="w-full truncate border-b border-border bg-transparent text-right text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
              </div>

              <!-- Tournament + date -->
              <div class="flex items-center gap-3 border-t border-border pt-3">
                <div class="flex min-w-0 flex-1 items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-muted-foreground">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                  <input
                    [(ngModel)]="meta.tournament"
                    placeholder="Torneo"
                    class="w-full truncate border-b border-transparent bg-transparent text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-border focus:text-foreground"
                  />
                </div>
                <div class="flex shrink-0 items-center">
                  <app-date-picker [(ngModel)]="meta.date" />
                </div>
              </div>

              <!-- Round + table -->
              <div class="flex items-center gap-4 border-t border-border pt-3">
                <div class="flex items-center gap-1.5">
                  <span class="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/60">Ronda</span>
                  <input
                    type="text" inputmode="numeric" pattern="[0-9]*"
                    [(ngModel)]="meta.round"
                    placeholder="—"
                    class="w-10 border-b border-transparent bg-transparent text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground/30 focus:border-border focus:text-foreground"
                  />
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/60">Mesa</span>
                  <input
                    type="text" inputmode="numeric" pattern="[0-9]*"
                    [(ngModel)]="meta.table"
                    placeholder="—"
                    class="w-10 border-b border-transparent bg-transparent text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground/30 focus:border-border focus:text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          <app-move-list class="min-h-0 flex-1" />

          <div class="flex shrink-0 gap-3 border-t border-border p-4">
            <app-button [fullWidth]="true" (clicked)="handleSave()">
              @if (saved()) {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                Guardado
              } @else {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Guardar
              }
            </app-button>
            <app-button variant="outline" (clicked)="showPgnModal.set(true)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              PGN
            </app-button>
          </div>
        </aside>
      </div>

      <!-- PGN modal -->
      @if (showPgnModal()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px)"
          (click)="showPgnModal.set(false)"
        >
          <div class="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between border-b border-border px-5 py-4">
              <div class="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span class="text-sm font-semibold text-foreground">PGN</span>
              </div>
              <button type="button" (click)="showPgnModal.set(false)" class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div class="p-5">
              <textarea
                readonly
                [value]="fullPgn()"
                rows="8"
                class="w-full resize-none rounded-xl border border-border bg-muted p-4 text-xs leading-relaxed text-muted-foreground outline-none"
                style="font-family: var(--font-notation)"
                (click)="selectAll($event)"
              ></textarea>
            </div>

            <div class="flex items-center gap-3 px-5 pb-5">
              <app-button variant="secondary" [fullWidth]="true" (clicked)="handleCopyPgn()">
                @if (copied()) {
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                  Copiado
                } @else {
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copiar
                }
              </app-button>
              <app-button [fullWidth]="true" (clicked)="handleDownload()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar .pgn
              </app-button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Mobile: width is the only scarce dimension, so a simple cap is enough. Desktop
       (>=1024px, matches Tailwind's lg): board-fit grows to fill the leftover height
       in the column, becomes a size container, and board-square sizes itself to
       min(container width, container height) via container query units -- the
       classic CSS-only "square that fits both axes" trick, no JS/ResizeObserver. */
    .board-fit { width: 100%; max-width: 480px; }
    .board-square { width: 100%; }
    @media (min-width: 1024px) {
      .board-fit { max-width: none; flex: 1 1 0%; min-height: 0; container-type: size; }
      .board-square { width: min(100cqw, 100cqh); height: min(100cqw, 100cqh); }
    }
  `],
})
export class EditorPage {
  protected readonly gameState = inject(GameStateService);
  private readonly rules = inject(ChessRulesService);
  private readonly analysis = inject(AnalysisService);
  private readonly route = inject(ActivatedRoute);

  private readonly _orientation = signal<Orientation>('white');
  readonly orientation = this._orientation.asReadonly();

  readonly showPgnModal = signal(false);
  readonly saved = signal(false);
  readonly copied = signal(false);

  // Plain object (not a signal) so [(ngModel)] can bind straight to its fields --
  // same pattern as auth.page.ts. Reset fresh on every visit, like the rest of the
  // editor's state; nothing persists it yet (see handleSave).
  readonly metaOpen = signal(false);
  meta: GameMeta = { ...EMPTY_META };

  readonly checkSquare = computed<string | null>(() => {
    const fen = this.gameState.currentFen();
    if (!this.rules.isCheck(fen)) return null;
    return this.rules.kingSquare(fen, this.gameState.activeColor());
  });

  readonly controlLabel = computed(() => {
    const boardIdx = this.gameState.currentBoardMoveIndex();
    if (boardIdx < 0) return 'Posición inicial';
    const move = this.gameState.moves()[boardIdx];
    if (!move) return '';
    const prefix = move.color === 'black' ? `${move.moveNumber}...` : `${move.moveNumber}.`;
    return `${prefix} ${move.notation}`;
  });

  constructor() {
    this.gameState.reset();
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) {
      this.analysis.getAnalysis(id).subscribe({
        next: result => {
          if (result.moves) this.gameState.loadOcrMoves(result.moves);
        },
        error: () => {
          // No pasa nada -- el editor sencillamente arranca en blanco.
        },
      });
    }
  }

  toggleOrientation(): void {
    this._orientation.update(o => (o === 'white' ? 'black' : 'white'));
  }

  onMoveMade(attempt: BoardMoveAttempt): void {
    this.gameState.makeMove(attempt.from, attempt.to, attempt.promotion ?? 'q');
  }

  /** Keeps GameStateService.pgn()'s trailing result token in sync with the metadata form. */
  onResultChange(result: GameMeta['result']): void {
    this.meta = { ...this.meta, result };
    this.gameState.setResult(metaResultToGameResult(result));
  }

  /** [Event]/[Site]/[Date]/... header tags (from `meta`) + the move text (from GameStateService). */
  fullPgn(): string {
    return buildPgnHeader(this.meta) + this.gameState.pgn();
  }

  handleSave(): void {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }

  handleCopyPgn(): void {
    navigator.clipboard.writeText(this.fullPgn()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  handleDownload(): void {
    const blob = new Blob([this.fullPgn()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildPgnFilename(this.meta);
    a.click();
    URL.revokeObjectURL(url);
  }

  selectAll(event: Event): void {
    (event.target as HTMLTextAreaElement).select();
  }
}
