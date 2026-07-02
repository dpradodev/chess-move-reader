import { Component, computed, effect, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { GameStateService } from '../../../../core/services/game-state.service';
import { MovePair } from '../../../../core/models/move.model';
import { MoveRowComponent } from '../move-row/move-row.component';

@Component({
  selector: 'app-move-sheet',
  imports: [MoveRowComponent],
  host: { class: 'flex flex-col flex-1 min-h-0 overflow-hidden' },
  styles: [`.no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
            .no-scrollbar::-webkit-scrollbar { display: none; }`],
  template: `
    <div class="flex h-full min-h-0 flex-col">

      <!-- Header -->
      <div class="flex shrink-0 items-center justify-between border-b border-[#d4b0bc] bg-[#f5edda] px-4 py-2.5">
        <h3 class="text-sm font-semibold text-[#2a1820]">Movimientos</h3>
        <button
          type="button"
          (click)="showHelp.set(true)"
          class="rounded-full p-1 text-[#a07888] transition-colors hover:bg-[#f0d8dc] hover:text-[#8a3a4e]"
          title="Cómo funciona"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      <!-- Help popup -->
      @if (showHelp()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          (click)="showHelp.set(false)"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-[#2a1820]/40 backdrop-blur-[2px]"></div>

          <!-- Panel -->
          <div
            class="relative w-full max-w-sm rounded-2xl border border-[#d4b0bc] bg-[#fdf6e8] shadow-2xl"
            (click)="$event.stopPropagation()"
          >
            <!-- Panel header -->
            <div class="flex items-center justify-between border-b border-[#d4b0bc] px-5 py-4">
              <div class="flex items-center gap-2">
                <div class="flex h-7 w-7 items-center justify-center rounded-full bg-[#b85c6e]">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 class="text-sm font-semibold text-[#2a1820]">Cómo usar la planilla</h2>
              </div>
              <button
                type="button"
                (click)="showHelp.set(false)"
                class="rounded-full p-1 text-[#a07888] transition-colors hover:bg-[#f0d8dc] hover:text-[#8a3a4e]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Panel body -->
            <div class="space-y-3 px-5 py-4">

              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#f5edda]">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-[#7a4a58]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-semibold text-[#2a1820]">Navegar</p>
                  <p class="text-xs text-[#7a4a58]">Toca o haz click en cualquier jugada para saltar a esa posición en el tablero.</p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#f5edda]">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-[#7a4a58]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-semibold text-[#2a1820]">Editar jugada</p>
                  <p class="text-xs text-[#7a4a58]">Usa el lápiz junto a cada jugada para corregir la notación detectada por el OCR.</p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#fce8ec]">
                  <span class="text-[10px] font-bold text-[#b85c6e]">—</span>
                </div>
                <div>
                  <p class="text-xs font-semibold text-[#2a1820]">Jugada no detectada</p>
                  <p class="text-xs text-[#7a4a58]">Celda con borde discontinuo: el OCR no reconoció esa jugada. Tócala para rellenarla manualmente y desbloquear el tablero.</p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#f5edda]">
                  <span class="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-sky-400 text-[7px] font-bold text-white">≈</span>
                </div>
                <div>
                  <p class="text-xs font-semibold text-[#2a1820]">Inferida automáticamente</p>
                  <p class="text-xs text-[#7a4a58]">Solo existía una jugada legal que encajaba con la siguiente posición conocida.</p>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#f5edda]">
                  <span class="h-2.5 w-2.5 rounded-full bg-[length:100%] bg-gradient-to-r from-red-400 via-yellow-400 to-emerald-500"></span>
                </div>
                <div>
                  <p class="text-xs font-semibold text-[#2a1820]">Confianza OCR</p>
                  <p class="text-xs text-[#7a4a58]">El punto de color indica la seguridad del OCR: verde alto, rojo bajo. El <span class="font-mono">✓</span> verde significa confianza total.</p>
                </div>
              </div>

            </div>

            <!-- Panel footer -->
            <div class="border-t border-[#d4b0bc] px-5 py-3">
              <button
                type="button"
                (click)="showHelp.set(false)"
                class="w-full rounded-lg bg-[#b85c6e] py-2 text-sm font-medium text-white transition-colors hover:bg-[#a04d5e]"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Error de edición -->
      @if (editError()) {
        <div class="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
          Movimiento inválido: "{{ editError() }}"
        </div>
      }

      <!-- Lista de movimientos -->
      <div #tableContainer class="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        @if (movePairs().length === 0) {
          <p class="p-4 text-sm text-[#a07888]">No hay movimientos cargados.</p>
        } @else {
          <table class="w-full border-separate border-spacing-0" style="table-layout: fixed">
            <thead>
              <tr class="text-xs text-[#7a4a58]">
                <th style="width: 2.25rem"
                    class="sticky top-0 z-10 border-b border-[#d4b0bc] bg-[#f5edda] px-2 py-2 text-right font-normal">#</th>
                <th class="sticky top-0 z-10 border-b border-[#d4b0bc] bg-[#f5edda] py-2 pl-3 text-left font-semibold tracking-wide">Blancas</th>
                <th class="sticky top-0 z-10 border-b border-l border-[#d4b0bc] bg-[#f5edda] py-2 pl-3 text-left font-semibold tracking-wide">Negras</th>
              </tr>
            </thead>
            <tbody>
              @for (pair of movePairs(); track pair.moveNumber) {
                <app-move-row
                  [pair]="pair"
                  [activeMoveIndex]="gameState.currentMoveIndex()"
                  (moveClicked)="gameState.goToMove($event)"
                  (moveEdited)="onMoveEdited($event)"
                />
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Footer: Generar PGN -->
      @if (movePairs().length > 0) {
        <div class="relative shrink-0 border-t border-[#d4b0bc] p-3">

          <!-- PGN panel — floats above the button, doesn't push the move list -->
          @if (showPgn()) {
            <div class="absolute bottom-full left-0 right-0 z-20 rounded-t-xl border border-b-0 border-[#d4b0bc] bg-[#fdf6e8] px-3 pt-3 pb-2 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.12),-4px_0_8px_-2px_rgba(0,0,0,0.06),4px_0_8px_-2px_rgba(0,0,0,0.06)]">
              <textarea
                [value]="gameState.pgn()"
                readonly
                rows="5"
                class="w-full resize-none rounded-lg border border-[#d4b0bc] bg-[#f5edda] p-2 font-mono text-xs text-[#2a1820] outline-none"
                (click)="$event.target && selectAll($event)"
              ></textarea>
              <button
                type="button"
                (click)="copyPgn()"
                class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#d4b0bc] px-3 py-1.5 text-xs font-medium text-[#7a4a58] transition-colors hover:bg-[#f5e8ec]"
              >
                @if (copied()) {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Copiado ✓
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" />
                  </svg>
                  Copiar PGN
                }
              </button>
            </div>
          }

          <button
            type="button"
            (click)="togglePgn()"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8a3a4e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#7a2a3e]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform" [class.rotate-180]="showPgn()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PGN
          </button>
        </div>
      }
    </div>
  `,
})
export class MoveSheetComponent {
  @ViewChild('tableContainer') tableContainer?: ElementRef<HTMLElement>;

  protected readonly gameState = inject(GameStateService);

  readonly editError = signal<string | null>(null);
  readonly showPgn = signal(false);
  readonly showHelp = signal(false);
  readonly copied = signal(false);

  private _clearErrorTimer: ReturnType<typeof setTimeout> | null = null;
  private _clearCopiedTimer: ReturnType<typeof setTimeout> | null = null;

  readonly movePairs = computed<MovePair[]>(() => {
    const moves = this.gameState.moves();
    const pairs: MovePair[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: moves[i],
        black: moves[i + 1],
      });
    }
    return pairs;
  });

  constructor() {
    effect(() => {
      const idx = this.gameState.currentMoveIndex();
      if (idx < 0) return;
      setTimeout(() => {
        this.tableContainer?.nativeElement
          .querySelector('[data-active="true"]')
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 0);
    });
  }

  onMoveEdited(event: { index: number; notation: string }): void {
    const success = this.gameState.updateMoveNotation(event.index, event.notation);
    if (!success) {
      this.showError(event.notation);
    } else {
      this.editError.set(null);
    }
  }

  togglePgn(): void {
    this.showPgn.update(v => !v);
    this.copied.set(false);
  }

  copyPgn(): void {
    navigator.clipboard.writeText(this.gameState.pgn()).then(() => {
      this.copied.set(true);
      if (this._clearCopiedTimer) clearTimeout(this._clearCopiedTimer);
      this._clearCopiedTimer = setTimeout(() => this.copied.set(false), 2000);
    });
  }

  selectAll(event: Event): void {
    (event.target as HTMLTextAreaElement).select();
  }

  private showError(notation: string): void {
    if (this._clearErrorTimer) clearTimeout(this._clearErrorTimer);
    this.editError.set(notation);
    this._clearErrorTimer = setTimeout(() => this.editError.set(null), 3000);
  }
}
