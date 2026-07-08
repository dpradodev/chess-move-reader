import { Component, input, output } from '@angular/core';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ' +
  'transition-all outline-none disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] shrink-0';

const VARIANTS: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-white hover:bg-destructive/90',
  outline: 'border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};

const SIZES: Record<ButtonSize, string> = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-8 rounded-md gap-1.5 px-3 text-sm',
  lg: 'h-10 rounded-md px-6 text-base',
  icon: 'size-9 rounded-md',
};

/**
 * Base button primitive, styled from the app.web2 theme tokens (bg-primary, etc.)
 * instead of hardcoded hex — see docs/chess-board.md sibling doc in this app's
 * README for why the token layer exists. Variant/size names mirror shadcn's
 * button.tsx (the design's token system anticipates this scheme even though the
 * Figma Make export itself never wired the shadcn components into App.tsx).
 */
@Component({
  selector: 'app-button',
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [class]="classes()"
      (click)="clicked.emit()"
    >
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('default');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly fullWidth = input(false);

  readonly clicked = output<void>();

  classes(): string {
    const width = this.fullWidth() ? 'w-full' : '';
    return [BASE, VARIANTS[this.variant()], SIZES[this.size()], width].filter(Boolean).join(' ');
  }
}
