import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { Chess } from 'chess.js';
import { GameStateService } from '../../../../core/services/game-state.service';
import { ChessSquareComponent } from '../chess-square/chess-square.component';
import { BoardControlsComponent } from '../board-controls/board-controls.component';
import { File, Rank } from '../../../../core/models/position.model';

const FILES: File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS: Rank[] = [8, 7, 6, 5, 4, 3, 2, 1];

@Component({
  selector: 'app-chess-board',
  imports: [ChessSquareComponent, BoardControlsComponent],
  template: `
    <!-- Outer wrapper: flex column, no items-center so w-full works correctly on every child -->
    <div class="flex w-full flex-col gap-3">

      <!-- Board grid -->
      <div
        class="mx-auto grid w-full grid-cols-8 overflow-hidden rounded-sm shadow-xl ring-2 ring-[#8a3a4e]"
        (touchstart)="onBoardTouchStart($event)"
        style="max-width: 560px"
        role="grid"
        aria-label="Tablero de ajedrez"
      >
        @for (rank of ranks; track rank) {
          @for (file of files; track file) {
            <app-chess-square
              [file]="file"
              [rank]="rank"
              [piece]="getSquarePiece(file, rank)"
              [selected]="selectedSquare() === squareId(file, rank)"
              [isSelectable]="isSelectable(file, rank)"
              [isPossibleMove]="isPossibleMove(file, rank)"
              [isLastMove]="isLastMove(file, rank)"
              [showFile]="rank === 1"
              [showRank]="file === 'a'"
              (clicked)="onSquareClick(file, rank)"
              (dragStarted)="onSquareDragStart(file, rank)"
              (dragEnded)="onSquareDragEnd()"
              (dropped)="onSquareDrop(file, rank)"
            />
          }
        }
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
export class ChessBoardComponent implements OnDestroy {
  protected readonly gameState = inject(GameStateService);

  readonly files = FILES;
  readonly ranks = RANKS;

  private readonly _selectedSquare = signal<string | null>(null);
  readonly selectedSquare = this._selectedSquare.asReadonly();

  // Touch drag state
  private _ghostEl: HTMLElement | null = null;
  private readonly _touchMoveHandler = (e: TouchEvent) => this.onTouchMove(e);
  private readonly _touchEndHandler  = (e: TouchEvent) => this.onTouchEnd(e);

  readonly possibleMoveTargets = computed<Set<string>>(() => {
    const sq = this._selectedSquare();
    if (!sq) return new Set();
    try {
      const moves = new Chess(this.gameState.currentFen())
        .moves({ square: sq as Parameters<Chess['moves']>[0] extends { square?: infer S } ? S : never, verbose: true });
      return new Set((moves as Array<{ to: string }>).map(m => m.to));
    } catch {
      return new Set();
    }
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
    effect(() => {
      this.gameState.currentMoveIndex();
      this._selectedSquare.set(null);
    });
  }

  squareId(file: File, rank: Rank): string {
    return `${file}${rank}`;
  }

  getSquarePiece(file: File, rank: Rank) {
    return this.gameState.currentBoard().get(`${file}${rank}`);
  }

  isSelectable(file: File, rank: Rank): boolean {
    const piece = this.getSquarePiece(file, rank);
    return !!piece && piece.color === this.gameState.activeColor();
  }

  isPossibleMove(file: File, rank: Rank): boolean {
    return this.possibleMoveTargets().has(`${file}${rank}`);
  }

  isLastMove(file: File, rank: Rank): boolean {
    const squares = this.gameState.lastMoveSquares();
    if (!squares) return false;
    const sq = `${file}${rank}`;
    return sq === squares[0] || sq === squares[1];
  }

  onSquareDragStart(file: File, rank: Rank): void {
    const sq = this.squareId(file, rank);
    if (this.isSelectable(file, rank)) {
      this._selectedSquare.set(sq);
    }
  }

  onSquareDragEnd(): void {
    this._selectedSquare.set(null);
  }

  onSquareDrop(file: File, rank: Rank): void {
    const sq = this.squareId(file, rank);
    const selected = this._selectedSquare();
    if (selected && this.possibleMoveTargets().has(sq)) {
      this.gameState.makeMove(selected, sq);
    }
    this._selectedSquare.set(null);
  }

  onSquareClick(file: File, rank: Rank): void {
    const sq = `${file}${rank}`;
    const selected = this._selectedSquare();

    if (selected) {
      if (this.possibleMoveTargets().has(sq)) {
        this.gameState.makeMove(selected, sq);
        this._selectedSquare.set(null);
        return;
      }
      if (this.isSelectable(file, rank)) {
        this._selectedSquare.set(sq);
        return;
      }
      this._selectedSquare.set(null);
      return;
    }

    if (this.isSelectable(file, rank)) {
      this._selectedSquare.set(sq);
    }
  }

  // ── Touch drag ──────────────────────────────────────────────

  onBoardTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const squareEl = el?.closest('[data-square]');
    if (!squareEl) return;

    const sq = squareEl.getAttribute('data-square')!;
    const file = sq[0] as File;
    const rank = +sq[1] as Rank;
    if (!this.isSelectable(file, rank)) return;

    event.preventDefault();
    this._selectedSquare.set(sq);

    const piece = this.getSquarePiece(file, rank)!;
    const size = (squareEl as HTMLElement).getBoundingClientRect().width;

    const ghost = document.createElement('img');
    ghost.src = `/pieces/${piece.color}${piece.type}.svg`;
    ghost.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'z-index:9999',
      `width:${size}px`,
      `height:${size}px`,
      'opacity:0.9',
      'transform:translate(-50%,-50%)',
      `left:${touch.clientX}px`,
      `top:${touch.clientY}px`,
    ].join(';');
    document.body.appendChild(ghost);
    this._ghostEl = ghost;

    document.addEventListener('touchmove', this._touchMoveHandler, { passive: false });
    document.addEventListener('touchend',  this._touchEndHandler);
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    if (this._ghostEl) {
      this._ghostEl.style.left = `${touch.clientX}px`;
      this._ghostEl.style.top  = `${touch.clientY}px`;
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    this._cleanupTouchDrag();

    const touch = event.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const squareEl = el?.closest('[data-square]');

    if (squareEl) {
      const sq = squareEl.getAttribute('data-square')!;
      const file = sq[0] as File;
      const rank = +sq[1] as Rank;
      this.onSquareDrop(file, rank);
    } else {
      this._selectedSquare.set(null);
    }
  }

  private _cleanupTouchDrag(): void {
    if (this._ghostEl) {
      document.body.removeChild(this._ghostEl);
      this._ghostEl = null;
    }
    document.removeEventListener('touchmove', this._touchMoveHandler);
    document.removeEventListener('touchend',  this._touchEndHandler);
  }

  ngOnDestroy(): void {
    this._cleanupTouchDrag();
  }
}
