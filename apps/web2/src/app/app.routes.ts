import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./pages/auth/auth.page').then(m => m.AuthPage),
  },
  {
    // Every authenticated screen lives under this empty-path parent so the shared
    // NavBar (ShellComponent) wraps them all without adding a URL segment -- /scan
    // stays /scan, it doesn't become /app/scan. /auth is a sibling above, outside
    // this subtree, so it never gets the header.
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: 'scan',
        loadComponent: () =>
          import('./pages/scan/scan.page').then(m => m.ScanPage),
      },
      {
        path: 'analyzing',
        loadComponent: () =>
          import('./pages/analyzing/analyzing.page').then(m => m.AnalyzingPage),
      },
      {
        path: 'editor',
        loadComponent: () =>
          import('./pages/editor/editor.page').then(m => m.EditorPage),
      },
      {
        path: 'archive',
        loadComponent: () =>
          import('./pages/archive/archive.page').then(m => m.ArchivePage),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'auth',
  },
];
