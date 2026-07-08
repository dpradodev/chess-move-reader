import { Component, computed, input } from '@angular/core';

export type BrandLogoSize = 'sm' | 'md' | 'lg';

const SCALES: Record<BrandLogoSize, { icon: number; text: string; box: string }> = {
  sm: { icon: 14, text: 'text-base', box: 'h-7 w-7 rounded-lg' },
  md: { icon: 18, text: 'text-lg', box: 'h-7 w-7 rounded-lg' },
  lg: { icon: 28, text: 'text-4xl', box: 'h-12 w-12 rounded-xl' },
};

/** Ported from design/src/app/App.tsx (RookIcon + BrandLogo). */
@Component({
  selector: 'app-brand-logo',
  template: `
    <div class="flex items-center gap-2.5">
      <div [class]="'flex shrink-0 items-center justify-center bg-primary ' + scale().box">
        <svg
          [attr.width]="scale().icon"
          [attr.height]="scale().icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="text-primary-foreground"
          aria-hidden="true"
        >
          <!-- Merlons -->
          <rect x="2" y="2" width="5" height="5" rx="0.75" />
          <rect x="9.5" y="2" width="5" height="5" rx="0.75" />
          <rect x="17" y="2" width="5" height="5" rx="0.75" />
          <!-- Upper body -->
          <rect x="2" y="6" width="20" height="4" />
          <!-- Shaft -->
          <rect x="4" y="10" width="16" height="7" />
          <!-- Base -->
          <rect x="1" y="17" width="22" height="5" rx="1" />
        </svg>
      </div>
      <span
        [class]="scale().text + ' leading-none tracking-tight text-foreground'"
        style="font-family: var(--font-display); font-weight: 700; letter-spacing: -0.02em"
      >
        Chess<span class="text-primary">Keeper</span>
      </span>
    </div>
  `,
  host: { class: 'contents' },
})
export class BrandLogoComponent {
  readonly size = input<BrandLogoSize>('md');

  readonly scale = computed(() => SCALES[this.size()]);
}
