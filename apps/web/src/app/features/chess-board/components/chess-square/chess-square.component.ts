import { Component, computed, input, output } from '@angular/core';
import { File, Rank } from '../../../../core/models/position.model';
import { BoardPiece } from '../../../../core/utils/fen.utils';
import { ChessPieceComponent } from '../chess-piece/chess-piece.component';

@Component({
  selector: 'app-chess-square',
  imports: [ChessPieceComponent],
  template: `
    <div
      class="relative flex items-center justify-center aspect-square select-none"
      [class]="squareBg()"
      [class.cursor-pointer]="selected() || isPossibleMove() || isSelectable()"
      [attr.aria-label]="label()"
      [attr.data-square]="label()"
      (click)="clicked.emit()"
      (dragover)="$event.preventDefault()"
      (drop)="onDrop($event)"
    >
      <!-- Last move highlight -->
      @if (isLastMove()) {
        <div class="absolute inset-0 bg-yellow-300/50 pointer-events-none z-0"></div>
      }

      <!-- Selected square highlight -->
      @if (selected()) {
        <div class="absolute inset-0 bg-emerald-400/40 pointer-events-none z-0"></div>
      }

      <!-- Possible move indicator: dot on empty, ring on capture -->
      @if (isPossibleMove()) {
        @if (piece()) {
          <div class="absolute inset-0 ring-4 ring-inset ring-emerald-600/50 pointer-events-none z-20 rounded-[1px]"></div>
        } @else {
          <div class="absolute inset-[30%] rounded-full bg-emerald-700/35 pointer-events-none z-20"></div>
        }
      }

      <!-- Piece -->
      @if (piece()) {
        <div
          class="absolute inset-[2%] z-10"
          [attr.draggable]="isSelectable() ? true : null"
          (dragstart)="onDragStart($event)"
          (dragend)="dragEnded.emit()"
        >
          <app-chess-piece [type]="piece()!.type" [color]="piece()!.color" />
        </div>
      }

      <!-- Coordinate labels -->
      @if (showRank()) {
        <span class="absolute top-0.5 left-1 text-[10px] font-semibold leading-none z-30 pointer-events-none"
          [class]="coordColor()">{{ rank() }}</span>
      }
      @if (showFile()) {
        <span class="absolute bottom-0.5 right-1 text-[10px] font-semibold leading-none z-30 pointer-events-none"
          [class]="coordColor()">{{ file() }}</span>
      }
    </div>
  `,
})
export class ChessSquareComponent {
  readonly file = input.required<File>();
  readonly rank = input.required<Rank>();
  readonly piece = input<BoardPiece | undefined>(undefined);
  readonly selected = input(false);
  readonly isSelectable = input(false);
  readonly isPossibleMove = input(false);
  readonly isLastMove = input(false);
  readonly showFile = input(false);
  readonly showRank = input(false);

  readonly clicked = output<void>();
  readonly dragStarted = output<void>();
  readonly dragEnded = output<void>();
  readonly dropped = output<void>();

  readonly label = computed(() => `${this.file()}${this.rank()}`);

  readonly isLight = computed(() => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return (files.indexOf(this.file()) + this.rank()) % 2 === 0;
  });

  readonly squareBg = computed(() => {
    const light = this.isLight();
    return light ? 'bg-[#e8d484]' : 'bg-[#b85c6e]';
  });

  readonly coordColor = computed(() =>
    this.isLight() ? 'text-[#b85c6e]' : 'text-[#e8d484]'
  );

  onDragStart(event: DragEvent): void {
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', this.label());
    this.dragStarted.emit();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dropped.emit();
  }
}
