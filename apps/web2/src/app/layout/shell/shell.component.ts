import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBarComponent } from '../../shared/components/nav-bar/nav-bar.component';

/**
 * Wraps every authenticated screen (scan/analyzing/editor/archive) with the shared
 * NavBar -- mounted once as the parent of those routes in app.routes.ts, so /auth
 * (outside this route subtree) never gets a header. Fixed 56px header + a scrollable
 * content region below it; pages fill that region with `h-full`/`min-h-full` instead
 * of `h-dvh`/`min-h-dvh` (which would double-count the header's height).
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, NavBarComponent],
  template: `
    <div class="flex h-dvh flex-col bg-background">
      <app-nav-bar />
      <main class="min-h-0 flex-1 overflow-y-auto">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ShellComponent {}
