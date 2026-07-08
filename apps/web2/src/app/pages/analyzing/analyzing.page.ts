import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { interval } from 'rxjs';
import { filter, startWith, switchMap, take } from 'rxjs/operators';
import { AnalysisService } from '../../core/services/analysis.service';
import { SpinnerComponent } from '../../shared/components/ui/spinner/spinner.component';

const STEPS = [
  'Detectando bordes de la planilla',
  'Extrayendo cuadrícula de jugadas',
  'Interpretando notación algebraica',
  'Validando secuencia de movimientos',
];
const STEP_MS = 650;
const POLL_MS = 400;

/**
 * Ported from design/src/app/App.tsx (AnalyzingScreen). Unlike the original React
 * version -- which fakes progress on a fixed timer and never talks to a backend --
 * this drives the same visual step animation but gates the navigation to `/editor`
 * on the mocked AnalysisService actually reaching "done", so swapping in the real
 * apps/api polling later is a service-body change, not a page rewrite.
 */
@Component({
  selector: 'app-analyzing-page',
  imports: [SpinnerComponent],
  template: `
    <div
      class="flex min-h-full flex-col items-center justify-center gap-10 bg-background p-6"
      style="font-family: var(--font-body)"
    >
      @if (failed()) {
        <div class="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center">
          <h1 class="text-lg font-semibold text-foreground">No se pudo analizar la planilla</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ errorMessage() }}</p>
          <button
            type="button"
            (click)="backToScan()"
            class="mt-6 w-full rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver a intentarlo
          </button>
        </div>
      } @else {
        <!-- Animated icon -->
        <div class="relative">
          <div class="flex h-24 w-24 items-center justify-center rounded-2xl border border-border bg-card">
            <div class="animate-pulse select-none text-5xl">♟</div>
          </div>
          <div class="absolute -inset-2 rounded-3xl border-2 border-primary/30 animate-ping"></div>
        </div>

        <div class="flex w-full max-w-sm flex-col gap-6">
          <!-- Progress bar -->
          <div>
            <div class="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>Procesando planilla…</span>
              <span>{{ progress() }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                class="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                [style.width.%]="progress()"
              ></div>
            </div>
          </div>

          <!-- Step list -->
          <div class="flex flex-col gap-3">
            @for (label of steps; track label; let i = $index) {
              <div
                class="flex items-center gap-3 transition-all duration-500"
                [class.opacity-100]="i <= step()"
                [class.opacity-25]="i > step()"
              >
                <div
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300"
                  [class]="
                    i < step()
                      ? 'border-primary bg-primary/20'
                      : i === step()
                        ? 'border-primary/60'
                        : 'border-white/10'
                  "
                >
                  @if (i < step()) {
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="text-primary">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  } @else if (i === step()) {
                    <span class="text-primary"><app-spinner size="sm" /></span>
                  }
                </div>
                <span class="text-sm" [class.text-foreground]="i <= step()" [class.text-muted-foreground]="i > step()">
                  {{ label }}
                </span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class AnalyzingPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly analysis = inject(AnalysisService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly steps = STEPS;
  readonly step = signal(0);
  readonly failed = signal(false);
  readonly errorMessage = signal('');

  readonly progress = signal(0);

  private jobDone = false;
  private stepsFinished = false;
  private navigated = false;

  constructor() {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (!id) {
      this.router.navigateByUrl('/scan');
      return;
    }

    this.runStepAnimation();
    this.pollJob(id);
  }

  backToScan(): void {
    this.router.navigateByUrl('/scan');
  }

  private runStepAnimation(): void {
    STEPS.forEach((_, i) => {
      const timer = setTimeout(() => {
        this.step.set(i + 1);
        this.progress.set(Math.round(((i + 1) / STEPS.length) * 100));
        if (i + 1 === STEPS.length) {
          this.stepsFinished = true;
          this.maybeNavigate();
        }
      }, (i + 1) * STEP_MS);
      this.destroyRef.onDestroy(() => clearTimeout(timer));
    });
  }

  private pollJob(id: string): void {
    interval(POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.analysis.getAnalysis(id)),
        filter(result => result.status !== 'processing'),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: result => {
          if (result.status === 'done') {
            this.jobDone = true;
            this.maybeNavigate(id);
          } else {
            this.failed.set(true);
            this.errorMessage.set(result.error ?? 'El análisis ha fallado. Inténtalo de nuevo.');
          }
        },
        error: () => {
          this.failed.set(true);
          this.errorMessage.set('El análisis ha fallado. Inténtalo de nuevo.');
        },
      });
  }

  private maybeNavigate(id?: string): void {
    if (this.navigated || this.failed() || !this.jobDone || !this.stepsFinished) return;
    this.navigated = true;
    this.router.navigate(['/editor'], { queryParams: { id: id ?? this.route.snapshot.queryParamMap.get('id') } });
  }
}
