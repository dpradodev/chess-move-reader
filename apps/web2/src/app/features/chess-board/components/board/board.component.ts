import { Component, ElementRef, ViewChild, computed, effect, inject, input, output, signal } from '@angular/core';
import { ChessRulesService } from '../../../../core/services/chess-rules.service';
import { File, Rank } from '../../../../core/models/position.model';
import { BoardMap, BoardPiece, parseFen } from '../../../../core/utils/fen.utils';
import { squareCenterPercent, squareFromPoint, squareTopLeftPercent } from '../../utils/board-geometry';
import { diffBoards } from '../../utils/piece-diff';
import {
  BoardMoveAttempt,
  DrawableArrow,
  DrawableCircle,
  Orientation,
  PendingPromotion,
  PromotionPiece,
} from '../../models/board.model';
import { ChessSquareComponent } from '../chess-square/chess-square.component';
import { ChessPieceComponent } from '../chess-piece/chess-piece.component';
import { PromotionPickerComponent } from '../promotion-picker/promotion-picker.component';

const FILES: File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS: Rank[] = [8, 7, 6, 5, 4, 3, 2, 1];
const DRAG_THRESHOLD_PX = 5;
const FADE_OUT_MS = 220;

interface RenderedPiece {
  id: string;
  square: string;
  piece: BoardPiece;
  entering?: boolean;
  fadingOut?: boolean;
}

interface DragState {
  pointerId: number;
  from: string;
  piece: BoardPiece;
  startX: number;
  startY: number;
  isDragging: boolean;
}

interface DrawState {
  pointerId: number;
  from: string;
}

/**
 * Presentational chess board — knows nothing about game history, OCR, or app state.
 * Given a FEN it renders the position and lets the user interact with it; it only
 * ever reports *attempted* moves via `moveMade` — the caller decides whether/how to
 * commit them (this is what keeps it reusable outside the editor page).
 *
 * Ported from apps/web's premium board (docs/chess-board.md in the repo root
 * documents the full design). Only the palette changes here: rose/cream -> the
 * dark/gold ChessKeeper theme, using the `--board-light`/`--board-dark` tokens
 * already extracted in styles/theme.css instead of hardcoded hex.
 */
@Component({
  selector: 'app-board',
  imports: [ChessSquareComponent, ChessPieceComponent, PromotionPickerComponent],
  template: `
    <div
      #boardEl
      class="relative aspect-square w-full touch-none select-none"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerCancel($event)"
      (contextmenu)="$event.preventDefault()"
    >
      <!-- Squares layer -->
      <div class="absolute inset-0 grid grid-cols-8 overflow-hidden rounded-sm shadow-2xl ring-1 ring-primary/20">
        @for (rank of ranks(); track rank) {
          @for (file of files(); track file) {
            <app-chess-square
              [file]="file"
              [rank]="rank"
              [selected]="isSelected(file, rank)"
              [isPossibleMove]="isLegalTarget(file, rank) && !hasPieceAt(file, rank)"
              [isPossibleCapture]="isLegalTarget(file, rank) && hasPieceAt(file, rank)"
              [isLastMove]="isLastMoveSquare(file, rank)"
              [isCheck]="isCheckSquare(file, rank)"
              [isDragOver]="isDragOverSquare(file, rank)"
              [showFile]="showFileCoord(rank)"
              [showRank]="showRankCoord(file)"
            />
          }
        }
      </div>

      <!-- Pieces layer -->
      <div class="absolute inset-0">
        @for (rp of renderedPieces(); track rp.id) {
          <div
            class="piece-slot absolute"
            style="width: 12.5%; height: 12.5%;"
            [class.piece-entering]="rp.entering"
            [class.piece-fading]="rp.fadingOut"
            [class.piece-hidden]="draggingFrom() === rp.square"
            [style.left.%]="squarePos(rp.square).left"
            [style.top.%]="squarePos(rp.square).top"
          >
            <app-chess-piece [type]="rp.piece.type" [color]="rp.piece.color" />
          </div>
        }
      </div>

      <!-- Annotations: arrows and circles drawn with the right mouse button -->
      <svg class="pointer-events-none absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker id="board-arrowhead" markerWidth="3.2" markerHeight="3.2" refX="1.6" refY="1.6" orient="auto">
            <path d="M0,0 L3.2,1.6 L0,3.2 Z" fill="#15803d" />
          </marker>
        </defs>
        @for (arrow of shapes().arrows; track arrow.from + arrow.to) {
          <line
            [attr.x1]="arrowLine(arrow).x1" [attr.y1]="arrowLine(arrow).y1"
            [attr.x2]="arrowLine(arrow).x2" [attr.y2]="arrowLine(arrow).y2"
            stroke="#15803d" stroke-width="1.4" stroke-linecap="round" opacity="0.8"
            marker-end="url(#board-arrowhead)"
          />
        }
        @for (circle of shapes().circles; track circle.square) {
          <circle
            [attr.cx]="centerOf(circle.square).x" [attr.cy]="centerOf(circle.square).y"
            r="5.7" fill="none" stroke="#15803d" stroke-width="1.4" opacity="0.8"
          />
        }
      </svg>

      <!-- Drag ghost: follows the pointer 1:1, no transition -->
      @if (dragGhost(); as ghost) {
        <div
          class="pointer-events-none fixed z-40"
          style="transform: translate(-50%, -50%); opacity: 0.92;"
          [style.left.px]="ghost.x"
          [style.top.px]="ghost.y"
          [style.width.px]="ghost.size"
          [style.height.px]="ghost.size"
        >
          <app-chess-piece [type]="ghost.piece.type" [color]="ghost.piece.color" />
        </div>
      }

      <!-- Promotion picker -->
      @if (pendingPromotion(); as pending) {
        <app-promotion-picker
          [color]="pending.color"
          [x]="centerOf(pending.to).x"
          [y]="centerOf(pending.to).y"
          (picked)="onPromotionPicked($event)"
          (cancelled)="onPromotionCancelled()"
        />
      }
    </div>
  `,
  styles: [`
    .piece-slot { transition: left 180ms ease, top 180ms ease; }
    .piece-hidden { opacity: 0; }
    .piece-entering { animation: piece-enter 150ms ease-out; }
    .piece-fading { animation: piece-exit 200ms ease-in forwards; }
    @keyframes piece-enter { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
    @keyframes piece-exit { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.8); } }
  `],
  host: { class: 'block w-full' },
})
export class BoardComponent {
  @ViewChild('boardEl') private readonly boardEl!: ElementRef<HTMLElement>;

  readonly fen = input.required<string>();
  readonly orientation = input<Orientation>('white');
  readonly lastMove = input<[string, string] | null>(null);
  readonly checkSquare = input<string | null>(null);
  readonly interactive = input(true);

  readonly moveMade = output<BoardMoveAttempt>();

  private readonly rules = inject(ChessRulesService);

  readonly files = computed(() => (this.orientation() === 'white' ? FILES : [...FILES].reverse()));
  readonly ranks = computed(() => (this.orientation() === 'white' ? RANKS : [...RANKS].reverse()));

  readonly pieceMap = computed<BoardMap>(() => parseFen(this.fen()));
  readonly sideToMove = computed<'w' | 'b'>(() => (this.fen().split(' ')[1] === 'b' ? 'b' : 'w'));

  private readonly _selected = signal<string | null>(null);
  readonly legalTargets = computed<Set<string>>(() => {
    const sq = this._selected();
    if (!sq || !this.interactive()) return new Set<string>();
    return this.rules.legalDestinations(this.fen(), sq);
  });

  readonly renderedPieces = signal<RenderedPiece[]>([]);
  readonly shapes = signal<{ arrows: DrawableArrow[]; circles: DrawableCircle[] }>({ arrows: [], circles: [] });
  readonly pendingPromotion = signal<PendingPromotion | null>(null);
  readonly draggingFrom = signal<string | null>(null);
  readonly hoverSquare = signal<string | null>(null);
  readonly dragGhost = signal<{ x: number; y: number; size: number; piece: BoardPiece } | null>(null);

  private prevMap: BoardMap = new Map();
  private idCounter = 0;
  private dragState: DragState | null = null;
  private drawState: DrawState | null = null;
  /** Plain mirror of `renderedPieces` for the sync effect to read without depending on its own output. */
  private pieces: RenderedPiece[] = [];

  constructor() {
    effect(() => this.syncPieces(this.fen()));
    effect(() => {
      this.fen();
      this.shapes.set({ arrows: [], circles: [] });
    });
  }

  // ── Template helpers ────────────────────────────────────────

  squarePos(square: string): { left: number; top: number } {
    return squareTopLeftPercent(square, this.orientation());
  }

  centerOf(square: string): { x: number; y: number } {
    return squareCenterPercent(square, this.orientation());
  }

  arrowLine(arrow: DrawableArrow): { x1: number; y1: number; x2: number; y2: number } {
    const from = this.centerOf(arrow.from);
    const to = this.centerOf(arrow.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const shorten = 0.25;
    return { x1: from.x, y1: from.y, x2: to.x - dx * shorten, y2: to.y - dy * shorten };
  }

  private squareId(file: File, rank: Rank): string {
    return `${file}${rank}`;
  }

  isSelected(file: File, rank: Rank): boolean {
    return this._selected() === this.squareId(file, rank);
  }

  isLegalTarget(file: File, rank: Rank): boolean {
    return this.legalTargets().has(this.squareId(file, rank));
  }

  hasPieceAt(file: File, rank: Rank): boolean {
    return this.pieceMap().has(this.squareId(file, rank));
  }

  isLastMoveSquare(file: File, rank: Rank): boolean {
    const lm = this.lastMove();
    if (!lm) return false;
    const sq = this.squareId(file, rank);
    return sq === lm[0] || sq === lm[1];
  }

  isCheckSquare(file: File, rank: Rank): boolean {
    return this.checkSquare() === this.squareId(file, rank);
  }

  isDragOverSquare(file: File, rank: Rank): boolean {
    return this.hoverSquare() === this.squareId(file, rank);
  }

  showFileCoord(rank: Rank): boolean {
    const r = this.ranks();
    return rank === r[r.length - 1];
  }

  showRankCoord(file: File): boolean {
    return file === this.files()[0];
  }

  // ── Pointer-driven interaction (mouse, touch, pen — one code path) ──

  onPointerDown(event: PointerEvent): void {
    if (!this.interactive() || this.pendingPromotion()) return;

    const square = this.squareAt(event);
    if (!square) return;

    if (event.button === 2) {
      event.preventDefault();
      this.drawState = { pointerId: event.pointerId, from: square };
      return;
    }
    if (event.button !== 0) return;

    if (this.shapes().arrows.length || this.shapes().circles.length) {
      this.shapes.set({ arrows: [], circles: [] });
    }

    const selected = this._selected();
    if (selected && selected !== square && this.legalTargets().has(square)) {
      this.tryMove(selected, square);
      this._selected.set(null);
      return;
    }

    const piece = this.pieceMap().get(square);
    if (piece && piece.color === this.sideToMove()) {
      event.preventDefault();
      this._selected.set(square);
      this.dragState = {
        pointerId: event.pointerId,
        from: square,
        piece,
        startX: event.clientX,
        startY: event.clientY,
        isDragging: false,
      };
      this.boardEl.nativeElement.setPointerCapture?.(event.pointerId);
    } else {
      this._selected.set(null);
    }
  }

  onPointerMove(event: PointerEvent): void {
    const drag = this.dragState;
    if (!drag || event.pointerId !== drag.pointerId) return;

    if (!drag.isDragging) {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      drag.isDragging = true;
      this.draggingFrom.set(drag.from);
    }

    const rect = this.boardEl.nativeElement.getBoundingClientRect();
    this.dragGhost.set({ x: event.clientX, y: event.clientY, size: rect.width / 8, piece: drag.piece });
    this.hoverSquare.set(this.squareAt(event));
  }

  onPointerUp(event: PointerEvent): void {
    const drag = this.dragState;
    if (drag && event.pointerId === drag.pointerId) {
      if (drag.isDragging) {
        const to = this.squareAt(event);
        if (to && to !== drag.from && this.legalTargets().has(to)) {
          this.tryMove(drag.from, to);
          this._selected.set(null);
        }
      }
      this.endDrag();
      return;
    }

    const draw = this.drawState;
    if (draw && event.pointerId === draw.pointerId) {
      const to = this.squareAt(event);
      if (to) {
        if (to === draw.from) this.toggleCircle(to);
        else this.toggleArrow(draw.from, to);
      }
      this.drawState = null;
    }
  }

  onPointerCancel(event: PointerEvent): void {
    if (this.dragState?.pointerId === event.pointerId) this.endDrag();
    if (this.drawState?.pointerId === event.pointerId) this.drawState = null;
  }

  private endDrag(): void {
    this.dragState = null;
    this.draggingFrom.set(null);
    this.dragGhost.set(null);
    this.hoverSquare.set(null);
  }

  private squareAt(event: PointerEvent): string | null {
    const rect = this.boardEl.nativeElement.getBoundingClientRect();
    return squareFromPoint(event.clientX, event.clientY, rect, this.orientation());
  }

  private tryMove(from: string, to: string): void {
    if (this.rules.needsPromotion(this.fen(), from, to)) {
      this.pendingPromotion.set({ from, to, color: this.sideToMove() });
    } else {
      this.moveMade.emit({ from, to });
    }
  }

  onPromotionPicked(promotion: PromotionPiece): void {
    const pending = this.pendingPromotion();
    if (!pending) return;
    this.pendingPromotion.set(null);
    this.moveMade.emit({ from: pending.from, to: pending.to, promotion });
  }

  onPromotionCancelled(): void {
    this.pendingPromotion.set(null);
    this._selected.set(null);
  }

  private toggleArrow(from: string, to: string): void {
    this.shapes.update(s => {
      const exists = s.arrows.some(a => a.from === from && a.to === to);
      return {
        ...s,
        arrows: exists ? s.arrows.filter(a => !(a.from === from && a.to === to)) : [...s.arrows, { from, to }],
      };
    });
  }

  private toggleCircle(square: string): void {
    this.shapes.update(s => {
      const exists = s.circles.some(c => c.square === square);
      return {
        ...s,
        circles: exists ? s.circles.filter(c => c.square !== square) : [...s.circles, { square }],
      };
    });
  }

  // ── Position diffing -> stable piece identities for CSS-driven animation ──

  private syncPieces(fen: string): void {
    const nextMap = parseFen(fen);
    const diff = diffBoards(this.prevMap, nextMap);
    this.prevMap = nextMap;

    // Reads the plain bookkeeping array, never the `renderedPieces` signal itself —
    // this effect also *writes* that signal below, and reading it here would make the
    // effect depend on its own output, re-triggering itself forever.
    const bySquare = new Map(this.pieces.map(p => [p.square, p] as const));
    const next: RenderedPiece[] = [];
    const movedTo = new Set(diff.moved.map(m => m.to));
    const appearedAt = new Set(diff.appeared.map(a => a.square));

    for (const square of nextMap.keys()) {
      if (movedTo.has(square) || appearedAt.has(square)) continue;
      const existing = bySquare.get(square);
      if (existing) next.push(existing);
    }

    for (const { from, to, piece } of diff.moved) {
      const existing = bySquare.get(from);
      next.push(existing ? { ...existing, square: to, entering: false, fadingOut: false } : { id: this.nextId(), square: to, piece });
    }

    for (const { square, piece } of diff.appeared) {
      next.push({ id: this.nextId(), square, piece, entering: true });
    }

    for (const square of diff.disappeared) {
      const existing = bySquare.get(square);
      if (existing && !existing.fadingOut) {
        const fading: RenderedPiece = { ...existing, fadingOut: true };
        next.push(fading);
        setTimeout(() => this.removePiece(fading.id), FADE_OUT_MS);
      }
    }

    this.pieces = next;
    this.renderedPieces.set(next);
  }

  private removePiece(id: string): void {
    this.pieces = this.pieces.filter(p => p.id !== id);
    this.renderedPieces.update(list => list.filter(p => p.id !== id));
  }

  private nextId(): string {
    return `p${this.idCounter++}`;
  }
}
