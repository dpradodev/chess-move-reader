import { Component, computed, effect, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { GameStateService } from '../../../../core/services/game-state.service';
import { MovePair } from '../../../../core/models/move.model';
import { MoveRowComponent } from '../move-row/move-row.component';

/**
 * Restyled ported version of apps/web's move-sheet for ChessKeeper's editor.
 * Same wiring to GameStateService (click a move -> goToMove, edit a cell ->
 * updateMoveNotation), different visual language (dark cards, gold accents).
 */
@Component({
  selector: 'app-move-list',
  imports: [MoveRowComponent],
  host: { class: 'flex flex-col flex-1 min-h-0 overflow-hidden' },
  styles: [`.no-scrollbar { scrollbar-width: none; }
            .no-scrollbar::-webkit-scrollbar { display: none; }`],
  template: `
    <div class="flex h-full min-h-0 flex-col">
      @if (editError()) {
        <div class="shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          Movimiento inválido: "{{ editError() }}"
        </div>
      }

      <div #listContainer class="no-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        @if (movePairs().length === 0) {
          <p class="p-3 text-sm text-muted-foreground">No hay movimientos cargados.</p>
        } @else {
          <div class="flex flex-col gap-0.5">
            @for (pair of movePairs(); track pair.moveNumber) {
              <app-move-row
                [pair]="pair"
                [activeMoveIndex]="gameState.currentMoveIndex()"
                (moveClicked)="gameState.goToMove($event)"
                (moveEdited)="onMoveEdited($event)"
              />
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class MoveListComponent {
  @ViewChild('listContainer') listContainer?: ElementRef<HTMLElement>;

  protected readonly gameState = inject(GameStateService);

  readonly editError = signal<string | null>(null);
  private clearErrorTimer: ReturnType<typeof setTimeout> | null = null;

  readonly movePairs = computed<MovePair[]>(() => {
    const moves = this.gameState.moves();
    const pairs: MovePair[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({ moveNumber: Math.floor(i / 2) + 1, white: moves[i], black: moves[i + 1] });
    }
    return pairs;
  });

  constructor() {
    effect(() => {
      const idx = this.gameState.currentMoveIndex();
      if (idx < 0) return;
      setTimeout(() => {
        this.listContainer?.nativeElement
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

  private showError(notation: string): void {
    if (this.clearErrorTimer) clearTimeout(this.clearErrorTimer);
    this.editError.set(notation);
    this.clearErrorTimer = setTimeout(() => this.editError.set(null), 3000);
  }
}
