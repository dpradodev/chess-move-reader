import { Component, ElementRef, ViewChild, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovePair, MoveStatus } from '../../../../core/models/move.model';

type EditSlot = 'white' | 'black' | null;

/** 5-step discrete scale, mirroring design/src/app/App.tsx's confidenceColor(). */
function confidenceClass(c: number): string {
  if (c >= 80) return 'border-confidence-high bg-confidence-high/20';
  if (c >= 60) return 'border-confidence-good bg-confidence-good/20';
  if (c >= 45) return 'border-confidence-medium bg-confidence-medium/20';
  if (c >= 30) return 'border-confidence-low bg-confidence-low/20';
  return 'border-confidence-poor bg-confidence-poor/20';
}

/** Matching hex for the inner dot -- same 5 steps as confidenceClass, kept as a
 * plain style binding since Tailwind can't resolve a token to an inline CSS value. */
function confidenceHex(c: number): string {
  if (c >= 80) return '#4ade80';
  if (c >= 60) return '#a3e635';
  if (c >= 45) return '#facc15';
  if (c >= 30) return '#fb923c';
  return '#f87171';
}

/**
 * Restyled row for ChessKeeper's editor, ported from apps/web's move-sheet but
 * following design/src/app/App.tsx's EditorScreen row markup (ConfidenceDot-style
 * indicator, dashed "undetected" cell, inline click-to-edit). Same underlying
 * MoveStatus semantics as apps/web -- only the visual language changes.
 */
@Component({
  selector: 'app-move-row',
  imports: [FormsModule, NgTemplateOutlet],
  template: `
    <div class="flex items-center gap-1 px-1">
      <span class="w-7 shrink-0 pr-1 text-right text-xs text-muted-foreground" style="font-family: var(--font-notation)">
        {{ pair().moveNumber }}.
      </span>

      <div class="group/white relative flex-1">
        <ng-container *ngTemplateOutlet="cell; context: { $implicit: 'white' }" />
      </div>

      <div class="group/black relative flex-1">
        @if (pair().black) {
          <ng-container *ngTemplateOutlet="cell; context: { $implicit: 'black' }" />
        }
      </div>
    </div>

    <!-- ── Cell ──────────────────────────────────────────────── -->
    <ng-template #cell let-slot>
      @if (editing() === slot) {
        <input
          #editInput
          [ngModel]="editValue()"
          (ngModelChange)="editValue.set($event)"
          (keydown.enter)="commitEdit()"
          (keydown.escape)="cancelEdit()"
          (blur)="commitEdit()"
          class="w-full rounded border border-primary/40 bg-primary/10 px-2 py-1 text-sm text-foreground outline-none"
          style="font-family: var(--font-notation)"
        />
      } @else if (status(slot) === 'gap') {
        <div
          class="flex cursor-pointer items-center gap-1.5 rounded border border-dashed border-white/15 bg-white/2 px-2 py-1.5 text-sm transition-colors hover:border-primary/40"
          (click)="startEdit(slot, notation(slot))"
          title="Movimiento no detectado — haz clic para introducirlo"
        >
          <span class="h-3.5 w-3.5 shrink-0 rounded-full border border-dashed border-white/25"></span>
          @if (notation(slot)) {
            <span class="truncate text-muted-foreground/60 line-through" style="font-family: var(--font-notation)">{{ notation(slot) }}</span>
          } @else {
            <span class="text-muted-foreground/40 italic" style="font-family: var(--font-notation)">—</span>
          }
        </div>
      } @else {
        <div
          class="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm transition-all duration-100"
          [attr.data-active]="isActive(slot)"
          [class]="rowClasses(slot)"
        >
          @if (status(slot) === 'unvalidated') {
            <span class="h-3.5 w-3.5 shrink-0 rounded-full border border-white/15 bg-white/5"></span>
          } @else if (status(slot) === 'inferred') {
            <span class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-sky-500/50 bg-sky-500/20" title="Inferida">
              <span class="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
            </span>
          } @else if (status(slot) === 'manual') {
            <span class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-500/20" title="Confirmado manualmente">
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </span>
          } @else {
            <span
              class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border"
              [class]="confidenceClass(confidence(slot))"
              [title]="confidence(slot) + '% confianza'"
            >
              <span class="h-1.5 w-1.5 rounded-full" [style.background-color]="confidenceHex(confidence(slot))"></span>
            </span>
          }

          <button
            type="button"
            (click)="onCellClick(slot)"
            [disabled]="status(slot) === 'unvalidated'"
            class="flex-1 truncate text-left disabled:cursor-default"
            style="font-family: var(--font-notation)"
          >
            {{ notation(slot) }}
          </button>

          <button
            type="button"
            (click)="startEdit(slot, notation(slot))"
            class="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover/white:opacity-100 group-hover/black:opacity-100"
            [attr.aria-label]="'Editar ' + notation(slot)"
            title="Editar jugada"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      }
    </ng-template>
  `,
  host: { style: 'display: block' },
})
export class MoveRowComponent {
  @ViewChild('editInput') editInputRef?: ElementRef<HTMLInputElement>;

  readonly pair = input.required<MovePair>();
  readonly activeMoveIndex = input(-1);

  readonly moveClicked = output<number>();
  readonly moveEdited = output<{ index: number; notation: string }>();

  readonly editing = signal<EditSlot>(null);
  readonly editValue = signal('');
  readonly confidenceClass = confidenceClass;
  readonly confidenceHex = confidenceHex;

  private indexFor(slot: string): number {
    const base = (this.pair().moveNumber - 1) * 2;
    return slot === 'white' ? base : base + 1;
  }

  isActive(slot: string): boolean {
    return this.activeMoveIndex() === this.indexFor(slot);
  }

  notation(slot: string): string {
    return slot === 'white' ? this.pair().white.notation : (this.pair().black?.notation ?? '');
  }

  confidence(slot: string): number {
    return slot === 'white' ? this.pair().white.confidence : (this.pair().black?.confidence ?? 100);
  }

  status(slot: string): MoveStatus {
    return slot === 'white' ? this.pair().white.status : (this.pair().black?.status ?? 'validated');
  }

  rowClasses(slot: string): string {
    if (this.status(slot) === 'unvalidated') return 'opacity-40 cursor-default';
    if (this.isActive(slot)) return 'bg-primary/20 text-primary font-semibold';
    return 'text-foreground hover:bg-secondary';
  }

  onCellClick(slot: string): void {
    if (this.editing() !== null || this.status(slot) === 'unvalidated') return;
    this.moveClicked.emit(this.indexFor(slot));
  }

  startEdit(slot: string, currentValue: string): void {
    this.editValue.set(currentValue);
    this.editing.set(slot as EditSlot);
    setTimeout(() => this.editInputRef?.nativeElement.select(), 0);
  }

  commitEdit(): void {
    const slot = this.editing();
    if (!slot) return;
    const notation = this.editValue().trim();
    const index = this.indexFor(slot);
    this.editing.set(null);
    if (notation) this.moveEdited.emit({ index, notation });
  }

  cancelEdit(): void {
    this.editing.set(null);
  }
}
