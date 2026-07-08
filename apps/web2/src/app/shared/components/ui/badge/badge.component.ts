import { Component, input } from '@angular/core';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const BASE =
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap ' +
  'rounded-md border px-2 py-0.5 text-xs font-medium transition-colors';

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  destructive: 'border-transparent bg-destructive text-white',
  outline: 'border-border text-foreground',
};

@Component({
  selector: 'app-badge',
  template: `<span [class]="classes()"><ng-content /></span>`,
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('default');

  classes(): string {
    return [BASE, VARIANTS[this.variant()]].join(' ');
  }
}
