import { Component, computed, input } from '@angular/core';
import { File, Rank } from '../../../../core/models/position.model';

@Component({
  selector: 'app-chess-square',
  template: `
    <div
      class="relative aspect-square select-none"
      [class]="squareBg()"
      [attr.data-square]="label()"
    >
      <!-- Last move highlight -->
      @if (isLastMove()) {
        <div class="absolute inset-0 bg-yellow-300/50 pointer-events-none z-0"></div>
      }

      <!-- Selected square highlight -->
      @if (selected()) {
        <div class="absolute inset-0 bg-emerald-400/40 pointer-events-none z-0"></div>
      }

      <!-- Check highlight -->
      @if (isCheck()) {
        <div class="absolute inset-0 pointer-events-none z-0 check-pulse"></div>
      }

      <!-- Possible move indicator: dot on empty, ring on capture -->
      @if (isPossibleCapture()) {
        <div class="absolute inset-0 ring-4 ring-inset ring-emerald-600/50 pointer-events-none z-0 rounded-[1px]"></div>
      } @else if (isPossibleMove()) {
        <div class="absolute inset-[30%] rounded-full bg-emerald-700/35 pointer-events-none z-0"></div>
      }

      <!-- Drag-over highlight -->
      @if (isDragOver()) {
        <div class="absolute inset-0 ring-4 ring-inset ring-sky-400/70 pointer-events-none z-0"></div>
      }

      <!-- Coordinate labels -->
      @if (showRank()) {
        <span class="absolute top-0.5 left-1 text-[10px] font-semibold leading-none z-0 pointer-events-none"
          [class]="coordColor()">{{ rank() }}</span>
      }
      @if (showFile()) {
        <span class="absolute bottom-0.5 right-1 text-[10px] font-semibold leading-none z-0 pointer-events-none"
          [class]="coordColor()">{{ file() }}</span>
      }
    </div>
  `,
  styles: [`
    .check-pulse {
      background: radial-gradient(circle, rgba(220, 38, 38, 0.85) 0%, rgba(220, 38, 38, 0.35) 55%, transparent 75%);
      animation: check-pulse 1.2s ease-in-out infinite;
    }
    @keyframes check-pulse {
      0%, 100% { opacity: 0.85; }
      50% { opacity: 0.5; }
    }
  `],
})
export class ChessSquareComponent {
  readonly file = input.required<File>();
  readonly rank = input.required<Rank>();
  readonly selected = input(false);
  readonly isPossibleMove = input(false);
  readonly isPossibleCapture = input(false);
  readonly isLastMove = input(false);
  readonly isCheck = input(false);
  readonly isDragOver = input(false);
  readonly showFile = input(false);
  readonly showRank = input(false);

  readonly label = computed(() => `${this.file()}${this.rank()}`);

  readonly isLight = computed(() => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return (files.indexOf(this.file()) + this.rank()) % 2 === 0;
  });

  readonly squareBg = computed(() => (this.isLight() ? 'bg-board-light' : 'bg-board-dark'));

  // Each square's coordinate label borrows the *other* tone, like text stenciled on wood.
  readonly coordColor = computed(() => (this.isLight() ? 'text-board-dark/70' : 'text-board-light/70'));
}
