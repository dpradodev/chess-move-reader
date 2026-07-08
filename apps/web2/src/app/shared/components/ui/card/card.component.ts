import { Component } from '@angular/core';

/**
 * Card composition, ported from design/src/app/components/ui/card.tsx (class
 * strings kept equivalent). Each part applies its classes to its own host
 * element (no extra wrapper div), so consumers can add classes the normal
 * Angular way: <app-card class="mt-4">. Compose the same way as the React
 * version:
 *
 *   <app-card>
 *     <app-card-header>
 *       <app-card-title>Title</app-card-title>
 *       <app-card-description>Description</app-card-description>
 *     </app-card-header>
 *     <app-card-content>...</app-card-content>
 *     <app-card-footer>...</app-card-footer>
 *   </app-card>
 */
@Component({
  selector: 'app-card',
  template: `<ng-content />`,
  host: { class: 'flex flex-col gap-6 rounded-xl border bg-card text-card-foreground' },
})
export class CardComponent {}

@Component({
  selector: 'app-card-header',
  template: `<ng-content />`,
  host: {
    class:
      '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]',
  },
})
export class CardHeaderComponent {}

@Component({
  selector: 'app-card-title',
  template: `<ng-content />`,
  host: { class: 'block leading-none' },
})
export class CardTitleComponent {}

@Component({
  selector: 'app-card-description',
  template: `<ng-content />`,
  host: { class: 'block text-muted-foreground' },
})
export class CardDescriptionComponent {}

@Component({
  selector: 'app-card-action',
  template: `<ng-content />`,
  host: { class: 'col-start-2 row-span-2 row-start-1 self-start justify-self-end', 'data-slot': 'card-action' },
})
export class CardActionComponent {}

@Component({
  selector: 'app-card-content',
  template: `<ng-content />`,
  host: { class: 'block px-6 last:pb-6' },
})
export class CardContentComponent {}

@Component({
  selector: 'app-card-footer',
  template: `<ng-content />`,
  host: { class: 'flex items-center px-6 pb-6' },
})
export class CardFooterComponent {}
