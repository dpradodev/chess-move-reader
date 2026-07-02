import { Component, ElementRef, input, output, signal, ViewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovePair, MoveStatus } from '../../../../core/models/move.model';

type EditSlot = 'white' | 'black' | null;

function confidenceColor(c: number): string {
  const hue = Math.round((c / 100) * 120);
  return `hsl(${hue}, 75%, 42%)`;
}

@Component({
  selector: 'app-move-row',
  imports: [FormsModule, NgTemplateOutlet],
  template: `
    <tr class="border-b border-[#e8d4da] text-sm hover:bg-[#f5edda]/60">
      <!-- # -->
      <td class="px-2 py-0.5 text-right text-xs font-medium tabular-nums text-[#a07888] select-none">
        {{ pair().moveNumber }}.
      </td>

      <!-- White -->
      <td class="py-0.5">
        <ng-container *ngTemplateOutlet="cell; context: { $implicit: 'white' }" />
      </td>

      <!-- Black -->
      <td class="border-l border-[#e8d4da] py-0.5">
        @if (pair().black) {
          <ng-container *ngTemplateOutlet="cell; context: { $implicit: 'black' }" />
        }
      </td>
    </tr>

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
          class="w-full rounded border border-emerald-400 bg-white px-2 py-0.5 font-mono text-sm text-gray-900 outline-none ring-1 ring-emerald-400"
        />
      } @else if (status(slot) === 'gap') {
        <div class="flex min-w-0 items-center gap-0.5">
          <div
            class="min-w-0 flex-1 cursor-pointer truncate rounded border border-dashed border-[#d4b0bc] bg-[#fce8ec] pl-3 pr-2 py-0.5 font-mono text-xs transition-colors hover:bg-[#f5d8e0]"
            [attr.data-active]="isActive(slot)"
            (click)="startEdit(slot, notation(slot))"
          >
            @if (notation(slot)) {
              <span class="text-[#8a3a4e] opacity-60 line-through">{{ notation(slot) }}</span>
            } @else {
              <span class="select-none text-[#b85c6e]">—</span>
            }
          </div>
          <button
            type="button"
            (click)="startEdit(slot, notation(slot))"
            class="shrink-0 rounded p-0.5 text-[#b85c6e] transition-colors hover:bg-[#f5d8e0] hover:text-[#8a3a4e]"
            title="Rellenar jugada"
            aria-label="Rellenar jugada"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      } @else {
        <div class="flex min-w-0 items-center gap-0.5">
          <button
            type="button"
            (click)="onCellClick(slot)"
            [attr.data-active]="isActive(slot)"
            class="flex min-w-0 flex-1 items-center gap-1 rounded pl-3 pr-2 py-0.5 text-left font-mono transition-colors hover:bg-[#f5edda] active:bg-[#f0d8dc]"
            [class.bg-[#f0d8dc]]="isActive(slot)"
            [class.text-[#6a1828]]="isActive(slot)"
            [class.font-semibold]="isActive(slot)"
            [class.text-sky-600]="status(slot) === 'inferred' && !isActive(slot)"
            [class.text-[#b0909a]]="status(slot) === 'unvalidated' && !isActive(slot)"
            [class.italic]="status(slot) === 'unvalidated'"
          >
            <span class="min-w-0 flex-1 truncate">{{ notation(slot) }}</span>
            <!-- confidence badge -->
            @if (status(slot) === 'inferred') {
              <span class="shrink-0 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-sky-400 text-[7px] font-bold text-white" title="Inferido automáticamente">≈</span>
            } @else if (status(slot) === 'unvalidated') {
              <span class="shrink-0 h-2.5 w-2.5 rounded-full bg-gray-300" title="Sin validar"></span>
            } @else if (confidence(slot) === 100) {
              <span class="shrink-0 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500 text-[7px] text-white" title="Confianza 100%">✓</span>
            } @else {
              <span class="shrink-0 h-2.5 w-2.5 rounded-full" [style.background-color]="confidenceColor(confidence(slot))" [title]="confidence(slot) + '% confianza'"></span>
            }
          </button>
          <button
            type="button"
            (click)="startEdit(slot, notation(slot))"
            class="shrink-0 rounded p-0.5 text-[#d4b0bc] transition-colors hover:bg-[#f5e8ec] hover:text-[#7a4a58]"
            [class.text-[#b85c6e]]="isActive(slot)"
            [attr.aria-label]="'Editar ' + notation(slot)"
            title="Editar jugada"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      }
    </ng-template>
  `,
  host: { style: 'display: contents' },
})
export class MoveRowComponent {
  @ViewChild('editInput') editInputRef?: ElementRef<HTMLInputElement>;

  readonly pair = input.required<MovePair>();
  readonly activeMoveIndex = input(-1);

  readonly moveClicked = output<number>();
  readonly moveEdited = output<{ index: number; notation: string }>();

  readonly editing = signal<EditSlot>(null);
  readonly editValue = signal('');
  readonly confidenceColor = confidenceColor;

  private indexFor(slot: string): number {
    const base = (this.pair().moveNumber - 1) * 2;
    return slot === 'white' ? base : base + 1;
  }

  isActive(slot: string): boolean {
    return this.activeMoveIndex() === this.indexFor(slot);
  }

  notation(slot: string): string {
    return slot === 'white'
      ? this.pair().white.notation
      : (this.pair().black?.notation ?? '');
  }

  confidence(slot: string): number {
    return slot === 'white'
      ? this.pair().white.confidence
      : (this.pair().black?.confidence ?? 100);
  }

  status(slot: string): MoveStatus {
    return slot === 'white'
      ? this.pair().white.status
      : (this.pair().black?.status ?? 'validated');
  }

  onCellClick(slot: string): void {
    if (this.editing() !== null) return;
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
