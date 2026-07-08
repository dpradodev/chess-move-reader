import { Component, computed, inject, signal } from '@angular/core';
import { GameStateService } from '../../../../core/services/game-state.service';
import { ChessRulesService } from '../../../../core/services/chess-rules.service';
import { BoardComponent } from '../board/board.component';
import { BoardControlsComponent } from '../board-controls/board-controls.component';
import { BoardMoveAttempt, Orientation } from '../../models/board.model';

@Component({
  selector: 'app-chess-board',
  imports: [BoardComponent, BoardControlsComponent],
  template: `
    <div class="flex w-full flex-col gap-3">

      <div class="mx-auto w-full" style="max-width: 560px">
        <app-board
          [fen]="gameState.currentFen()"
          [orientation]="orientation()"
          [lastMove]="gameState.lastMoveSquares()"
          [checkSquare]="checkSquare()"
          (moveMade)="onMoveMade($event)"
        />
      </div>

      <!-- Controls — same centering as the board -->
      <div class="mx-auto w-full" style="max-width: 560px">
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
      </div>

      <!-- Frozen indicator — same width as the board, always occupies consistent space -->
      @if (gameState.isBoardFrozen()) {
        <div
          class="mx-auto flex w-full items-center gap-2 rounded-lg border border-[#d4b0bc] bg-[#fce8ec] px-3 py-2 text-xs text-[#8a3a4e]"
          style="max-width: 560px"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>
            Tablero pausado — rellena la jugada
            <strong>{{ gameState.firstGapLabel() }}</strong>
            para continuar
          </span>
        </div>
      }

    </div>
  `,
  host: { class: 'block w-full' },
})
export class ChessBoardComponent {
  protected readonly gameState = inject(GameStateService);
  private readonly rules = inject(ChessRulesService);

  private readonly _orientation = signal<Orientation>('white');
  readonly orientation = this._orientation.asReadonly();

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

  toggleOrientation(): void {
    this._orientation.update(o => (o === 'white' ? 'black' : 'white'));
  }

  onMoveMade(attempt: BoardMoveAttempt): void {
    this.gameState.makeMove(attempt.from, attempt.to, attempt.promotion ?? 'q');
  }
}
