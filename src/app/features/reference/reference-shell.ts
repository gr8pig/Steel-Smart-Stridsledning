import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  REFERENCE_DOCS,
  REFERENCE_STATUS_CLASSES,
  REFERENCE_STATUS_LABELS as REFERENCE_STATUS_LABELS_MAP,
  REFERENCE_STATUS_ORDER as REFERENCE_STATUS_ORDER_VALUES,
} from './reference.manifest';

@Component({
  selector: 'app-reference-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full w-full overflow-hidden bg-boreal-canvas text-boreal-text-primary">
      <div class="flex h-full flex-col lg:flex-row">
        <aside class="w-full border-b border-boreal-border bg-boreal-panel/80 backdrop-blur lg:h-full lg:w-[19rem] lg:border-b lg:border-r-0">
          <div class="flex h-full flex-col overflow-hidden">
            <div class="border-b border-boreal-border px-5 py-5">
              <div class="mb-3 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-boreal-text-muted">
                <mat-icon class="!text-[12px] !w-3 !h-3">menu_book</mat-icon>
                Reference Graph
              </div>
              <h1 class="text-2xl font-semibold tracking-tight text-boreal-text-primary">SSS Documentation</h1>
              <p class="mt-2 text-[11px] leading-relaxed text-boreal-text-muted">
                Truth-first documentation mapped from the actual repo, not the aspirational backbone.
              </p>
            </div>

            <div class="grid grid-cols-2 gap-px border-b border-boreal-border bg-boreal-border">
              @for (status of REFERENCE_STATUS_ORDER; track status) {
                <div class="bg-boreal-panel px-4 py-3">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">{{ REFERENCE_STATUS_LABELS[status] }}</div>
                  <div class="mt-1 text-sm font-bold">{{ docsByStatus(status) }}</div>
                </div>
              }
            </div>

            <nav class="min-h-0 flex-1 overflow-y-auto p-2">
              <div class="px-3 pb-2 pt-2 text-[8px] font-black uppercase tracking-[0.28em] text-boreal-text-muted">
                Pages
              </div>
              <div class="space-y-1">
                @for (doc of docs; track doc.slug) {
                  <a
                    [routerLink]="doc.route"
                    routerLinkActive="bg-boreal-blue/10 border-boreal-blue text-boreal-text-primary"
                    class="flex items-start gap-3 rounded-sm border border-transparent px-3 py-2.5 text-left transition-colors hover:border-boreal-border hover:bg-boreal-panel-muted/30"
                    [title]="doc.summary"
                  >
                    <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border text-[9px] font-black"
                         [ngClass]="statusClass(doc.status)">
                      {{ doc.order.toString().padStart(2, '0') }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-[10px] font-black uppercase tracking-tight text-boreal-text-primary">{{ doc.title }}</div>
                      <div class="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-boreal-text-muted">{{ doc.status }}</div>
                    </div>
                  </a>
                }
              </div>
            </nav>
          </div>
        </aside>

        <section class="min-w-0 flex-1 overflow-hidden">
          <div class="h-full overflow-hidden">
            <router-outlet />
          </div>
        </section>
      </div>
    </div>
  `,
})
export class ReferenceShell {
  docs = REFERENCE_DOCS;
  REFERENCE_STATUS_LABELS = REFERENCE_STATUS_LABELS_MAP;
  REFERENCE_STATUS_ORDER = REFERENCE_STATUS_ORDER_VALUES;
  statusClass = (status: keyof typeof REFERENCE_STATUS_CLASSES) => REFERENCE_STATUS_CLASSES[status];

  docsByStatus(status: keyof typeof REFERENCE_STATUS_CLASSES): number {
    return this.docs.filter(doc => doc.status === status).length;
  }
}
