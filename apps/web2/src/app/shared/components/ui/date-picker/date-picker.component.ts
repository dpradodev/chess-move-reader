import { Component, HostListener, computed, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface DayCell {
  date: Date;
  iso: string;
  inMonth: boolean;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthOf(iso: string): { year: number; month: number } {
  const [year, month] = iso.split('-').map(Number);
  return { year, month: month - 1 };
}

/**
 * Themed replacement for the native `<input type="date">`, whose popup calendar
 * can't be restyled and reads poorly on ChessKeeper's dark background in most
 * browsers. ControlValueAccessor so it drops into `[(ngModel)]="meta.date"` exactly
 * like the input it replaces -- the model value stays an ISO "yyyy-mm-dd" string.
 */
@Component({
  selector: 'app-date-picker',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePickerComponent), multi: true }],
  template: `
    <div class="relative inline-block">
      <button
        type="button"
        [disabled]="disabled()"
        (click)="toggle()"
        class="flex items-center gap-1.5 border-b border-transparent bg-transparent text-xs text-muted-foreground outline-none transition-colors hover:border-border hover:text-foreground focus:border-border focus:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {{ displayLabel() ?? 'Fecha' }}
      </button>

      @if (open()) {
        <div class="fixed inset-0 z-40" (click)="close()"></div>
        <div class="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-border bg-card p-3 shadow-2xl" (click)="$event.stopPropagation()">
          <div class="mb-2 flex items-center justify-between">
            <button type="button" (click)="shiftMonth(-1)" class="rounded p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground" aria-label="Mes anterior">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span class="text-xs font-semibold text-foreground">{{ monthLabel() }}</span>
            <button type="button" (click)="shiftMonth(1)" class="rounded p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground" aria-label="Mes siguiente">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div class="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
            @for (w of weekdays; track w) {
              <span class="py-1">{{ w }}</span>
            }
          </div>

          <div class="grid grid-cols-7 gap-0.5">
            @for (cell of calendarDays(); track cell.iso) {
              <button
                type="button"
                (click)="selectDay(cell.iso)"
                class="flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors"
                [class]="dayClasses(cell)"
              >
                {{ cell.date.getDate() }}
              </button>
            }
          </div>

          <button
            type="button"
            (click)="selectDay(todayIso)"
            class="mt-2 w-full rounded-lg border border-border py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            Hoy
          </button>
        </div>
      }
    </div>
  `,
  host: { class: 'contents' },
})
export class DatePickerComponent implements ControlValueAccessor {
  protected readonly weekdays = WEEKDAYS;
  protected readonly todayIso = toIso(new Date());

  readonly open = signal(false);
  readonly disabled = signal(false);
  readonly value = signal('');
  readonly viewMonth = signal(monthOf(this.todayIso));

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly monthLabel = computed(() => {
    const { year, month } = this.viewMonth();
    return `${MONTH_NAMES[month]} ${year}`;
  });

  readonly displayLabel = computed(() => {
    const v = this.value();
    if (!v) return null;
    const [year, month, day] = v.split('-');
    return `${day}/${month}/${year}`;
  });

  readonly calendarDays = computed<DayCell[]>(() => {
    const { year, month } = this.viewMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first week
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(year, month, 1 - startOffset + i);
      return { date, iso: toIso(date), inMonth: date.getMonth() === month };
    });
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
    if (value) this.viewMonth.set(monthOf(value));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  toggle(): void {
    if (this.disabled()) return;
    this.open.update(v => !v);
    this.onTouched();
  }

  close(): void {
    this.open.set(false);
    this.onTouched();
  }

  shiftMonth(delta: number): void {
    const { year, month } = this.viewMonth();
    const d = new Date(year, month + delta, 1);
    this.viewMonth.set({ year: d.getFullYear(), month: d.getMonth() });
  }

  selectDay(iso: string): void {
    this.value.set(iso);
    this.onChange(iso);
    this.open.set(false);
  }

  dayClasses(cell: DayCell): string {
    if (cell.iso === this.value()) return 'bg-primary text-primary-foreground font-semibold';
    if (!cell.inMonth) return 'text-muted-foreground/30 hover:bg-white/5';
    if (cell.iso === this.todayIso) return 'border border-primary/50 text-primary hover:bg-white/5';
    return 'text-foreground hover:bg-white/5';
  }
}
