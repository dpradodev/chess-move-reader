import { Component, computed, input, output } from '@angular/core';
import { PromotionPiece } from '../../models/board.model';
import { ChessPieceComponent } from '../chess-piece/chess-piece.component';

const PIECES: PromotionPiece[] = ['q', 'n', 'r', 'b'];

@Component({
  selector: 'app-promotion-picker',
  imports: [ChessPieceComponent],
  template: `
    <!-- Backdrop: click outside cancels the pending move -->
    <div class="absolute inset-0 z-40" (click)="cancelled.emit()">
      <div
        class="absolute grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1.5 shadow-2xl"
        style="width: 34%; aspect-ratio: 1;"
        [style.left.%]="centerX()"
        [style.top.%]="centerY()"
        (click)="$event.stopPropagation()"
      >
        @for (piece of pieces; track piece) {
          <button
            type="button"
            (click)="picked.emit(piece)"
            class="flex items-center justify-center rounded-lg bg-secondary p-1 transition-colors hover:bg-primary/15"
            [attr.aria-label]="'Coronar a ' + piece"
          >
            <app-chess-piece [type]="piece" [color]="color()" />
          </button>
        }
      </div>
    </div>
  `,
  host: { class: 'contents' },
})
export class PromotionPickerComponent {
  readonly color = input.required<'w' | 'b'>();
  readonly x = input.required<number>();
  readonly y = input.required<number>();

  readonly picked = output<PromotionPiece>();
  readonly cancelled = output<void>();

  readonly pieces = PIECES;

  // Centers the ~34%-wide card on the target square's center point.
  readonly centerX = computed(() => this.x() - 17);
  readonly centerY = computed(() => this.y() - 17);
}
