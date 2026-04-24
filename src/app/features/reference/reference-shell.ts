import {ChangeDetectionStrategy, Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {REFERENCE_MANIFEST} from './reference.manifest';

@Component({
  selector: 'app-reference-shell',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="h-full w-full flex flex-col bg-boreal-canvas text-boreal-text-primary overflow-hidden">
      <header class="border-b border-boreal-border px-6 py-4 bg-boreal-canvas/80 backdrop-blur-xl">
        <div class="flex items-center justify-between gap-6">
          <div class="flex flex-col gap-1">
            <span class="text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Reference Shell</span>
            <h1 class="text-2xl font-light tracking-[0.2em] uppercase">Atlas / Labs</h1>
            <p class="text-[10px] font-mono uppercase tracking-widest text-boreal-text-muted italic">
              Route surface for resilience, counterfactual, and reference navigation.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <div class="hidden lg:flex items-center gap-2 rounded-sm border border-boreal-border bg-boreal-panel-muted/20 px-3 py-2">
              <mat-icon class="!text-[12px] text-boreal-blue">hub</mat-icon>
              <span class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">{{ surfaces.length }} surfaces</span>
            </div>
            <a
              routerLink="/overview"
              class="inline-flex items-center gap-2 rounded-sm border border-boreal-border px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted hover:text-boreal-text-primary hover:border-boreal-blue/30 transition-all"
            >
              <mat-icon class="!text-[10px] !w-3 !h-3">arrow_back</mat-icon>
              Back to Overview
            </a>
          </div>
        </div>
      </header>

      <div class="flex min-h-0 flex-1">
        <aside class="w-72 border-r border-boreal-border bg-boreal-panel flex flex-col overflow-y-auto">
          <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 flex items-center justify-between">
            <span>Surface Index</span>
            <span class="font-mono text-boreal-blue font-bold">LIVE</span>
          </div>

          <nav class="p-3 space-y-2">
            @for (surface of surfaces; track surface.id) {
              <a
                [routerLink]="surface.href"
                routerLinkActive="bg-boreal-blue/10 text-boreal-blue border-boreal-blue/30"
                [routerLinkActiveOptions]="{ exact: surface.route === '' }"
                class="flex items-start gap-3 rounded-sm border border-boreal-border bg-boreal-canvas/40 p-3 text-left transition-all hover:border-boreal-text-muted/60 hover:bg-boreal-panel-muted/30"
              >
                <div
                  class="mt-0.5 flex h-8 w-8 items-center justify-center rounded-sm border"
                  [class.border-boreal-blue/30]="surface.accent === 'blue'"
                  [class.border-boreal-green/30]="surface.accent === 'green'"
                  [class.border-boreal-amber/30]="surface.accent === 'amber'"
                  [class.bg-boreal-blue/10]="surface.accent === 'blue'"
                  [class.bg-boreal-green/10]="surface.accent === 'green'"
                  [class.bg-boreal-amber/10]="surface.accent === 'amber'"
                >
                  <mat-icon
                    [class.text-boreal-blue]="surface.accent === 'blue'"
                    [class.text-boreal-green]="surface.accent === 'green'"
                    [class.text-boreal-amber]="surface.accent === 'amber'">
                    {{ surface.icon }}
                  </mat-icon>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <h2 class="truncate text-[11px] font-bold uppercase tracking-tight">{{ surface.label }}</h2>
                    <span class="flex-shrink-0 text-[7px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">{{ surface.badge }}</span>
                  </div>
                  <p class="mt-1 text-[9px] leading-relaxed text-boreal-text-muted">{{ surface.detail }}</p>
                </div>
              </a>
            }
          </nav>
        </aside>

        <main class="min-h-0 flex-1 overflow-hidden">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReferenceShell {
  readonly surfaces = REFERENCE_MANIFEST;
}
