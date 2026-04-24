import {ChangeDetectionStrategy, Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {REFERENCE_MANIFEST} from './reference.manifest';

@Component({
  selector: 'app-reference-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    <div class="h-full w-full overflow-y-auto bg-boreal-canvas text-boreal-text-primary p-6">
      <section class="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div class="design-card !p-0 overflow-hidden">
          <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 flex items-center justify-between">
            <span>Reference Atlas Overview</span>
            <span class="text-boreal-blue font-mono font-bold">{{ surfaces.length }} SURFACES</span>
          </div>
          <div class="p-6 space-y-4">
            <div class="space-y-2">
              <h1 class="text-3xl font-light tracking-[0.2em] uppercase text-boreal-text-primary">Reference Surface</h1>
              <p class="max-w-3xl text-[11px] leading-relaxed text-boreal-text-secondary italic">
                Use this atlas to move between the planning, resilience, and counterfactual views without losing the Steel shell context.
              </p>
            </div>

            <div class="grid gap-3 md:grid-cols-3">
              @for (surface of surfaces; track surface.id) {
                <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-4 flex flex-col gap-3">
                  <div class="flex items-center justify-between">
                    <div class="w-9 h-9 rounded-sm flex items-center justify-center border"
                      [class.border-boreal-blue/30]="surface.accent === 'blue'"
                      [class.border-boreal-green/30]="surface.accent === 'green'"
                      [class.border-boreal-amber/30]="surface.accent === 'amber'"
                      [class.bg-boreal-blue/10]="surface.accent === 'blue'"
                      [class.bg-boreal-green/10]="surface.accent === 'green'"
                      [class.bg-boreal-amber/10]="surface.accent === 'amber'">
                      <mat-icon
                        [class.text-boreal-blue]="surface.accent === 'blue'"
                        [class.text-boreal-green]="surface.accent === 'green'"
                        [class.text-boreal-amber]="surface.accent === 'amber'">
                        {{ surface.icon }}
                      </mat-icon>
                    </div>
                    <span class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">{{ surface.badge }}</span>
                  </div>
                  <div class="space-y-1">
                    <h2 class="text-[12px] font-bold uppercase tracking-tight text-boreal-text-primary">{{ surface.label }}</h2>
                    <p class="text-[10px] leading-relaxed text-boreal-text-muted">{{ surface.summary }}</p>
                  </div>
                  <a
                    [routerLink]="surface.href"
                    class="inline-flex items-center justify-center gap-2 rounded-sm border border-boreal-border bg-boreal-canvas/60 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-primary hover:border-boreal-blue/40 hover:text-boreal-blue transition-all"
                  >
                    Launch Surface
                    <mat-icon class="!text-[10px] !w-3 !h-3">arrow_forward</mat-icon>
                  </a>
                </div>
              }
            </div>
          </div>
        </div>

        <aside class="design-card !p-0 overflow-hidden">
          <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20">Operational Notes</div>
          <div class="p-5 space-y-4">
            <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-4 space-y-2">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-boreal-blue animate-pulse"></span>
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Shell Behavior</span>
              </div>
              <p class="text-[10px] text-boreal-text-secondary leading-relaxed">
                The reference shell stays inside the global Steel app chrome so the nav rail and command bar remain active while moving between labs.
              </p>
            </div>

            <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Quick Links</span>
                <mat-icon class="!text-[10px] text-boreal-text-muted">shortcut</mat-icon>
              </div>
              <div class="flex flex-col gap-2">
                @for (surface of surfaces.slice(1); track surface.id) {
                  <a
                    [routerLink]="surface.href"
                    class="flex items-center justify-between rounded-sm border border-boreal-border px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-secondary hover:text-boreal-text-primary hover:border-boreal-blue/30 transition-all"
                  >
                    <span>{{ surface.label }}</span>
                    <mat-icon class="!text-[10px] !w-3 !h-3">arrow_forward</mat-icon>
                  </a>
                }
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReferencePage {
  readonly surfaces = REFERENCE_MANIFEST;
}
