import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  REFERENCE_DOCS,
  REFERENCE_STATUS_CLASSES,
  REFERENCE_STATUS_LABELS as REFERENCE_STATUS_LABELS_MAP,
  REFERENCE_STATUS_ORDER as REFERENCE_STATUS_ORDER_VALUES,
  buildReferenceGraphEdges,
} from './reference.manifest';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-reference-index',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full w-full overflow-y-auto bg-boreal-canvas">
      <div class="mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-6 p-6">
        <header class="overflow-hidden rounded-sm border border-boreal-border bg-boreal-panel shadow-2xl">
          <div class="grid gap-px bg-boreal-border md:grid-cols-4">
            <div class="bg-boreal-panel px-5 py-5 md:col-span-2">
              <div class="mb-3 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-boreal-text-muted">
                <mat-icon class="!text-[12px] !w-3 !h-3">hub</mat-icon>
                Documentation Graph
              </div>
              <h2 class="text-3xl font-semibold tracking-tight text-boreal-text-primary">Reference</h2>
              <p class="mt-3 max-w-2xl text-[12px] leading-relaxed text-boreal-text-secondary">
                A truth-first docs surface for BDT. Each node maps to a page in the 00-12 backbone and points back to the actual repo files that justify its status.
              </p>
            </div>
            <div class="bg-boreal-panel px-5 py-5">
              <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">Pages</div>
              <div class="mt-2 text-3xl font-bold">{{ docs.length }}</div>
            </div>
            <div class="bg-boreal-panel px-5 py-5">
              <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">Implemented-ish</div>
              <div class="mt-2 text-3xl font-bold text-boreal-blue">{{ countByStatus('implemented') + countByStatus('mock-simulation') }}</div>
            </div>
            <div class="bg-boreal-panel px-5 py-5">
              <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">Conceptual</div>
              <div class="mt-2 text-3xl font-bold text-boreal-text-muted">{{ countByStatus('conceptual') }}</div>
            </div>
          </div>
        </header>

        <section class="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div class="rounded-sm border border-boreal-border bg-boreal-panel shadow-2xl">
            <div class="flex items-center justify-between border-b border-boreal-border px-5 py-4">
              <div>
                <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">Graph view</div>
                <h3 class="mt-1 text-sm font-black uppercase tracking-[0.22em] text-boreal-text-primary">Docs topology</h3>
              </div>
              <a routerLink="/overview" class="text-[10px] font-bold uppercase tracking-[0.2em] text-boreal-blue hover:underline">
                Back to Overview
              </a>
            </div>

            <div class="relative overflow-hidden p-4">
              <svg class="h-[760px] w-full" viewBox="0 0 1200 860" role="img" aria-label="BDT documentation graph">
                <defs>
                  <marker id="refArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" fill="currentColor"></path>
                  </marker>
                </defs>

                <g opacity="0.35">
                  @for (edge of graphEdges(); track edgeKey(edge.from.slug, edge.to.slug)) {
                    <line
                      [attr.x1]="edge.from.graph.x"
                      [attr.y1]="edge.from.graph.y"
                      [attr.x2]="edge.to.graph.x"
                      [attr.y2]="edge.to.graph.y"
                      class="stroke-boreal-border"
                      stroke-width="1"
                      marker-end="url(#refArrow)"
                    />
                  }
                </g>

                @for (doc of docs; track doc.slug) {
                  <g [attr.transform]="'translate(' + doc.graph.x + ',' + doc.graph.y + ')'" class="cursor-pointer">
                    <a [routerLink]="doc.route" class="group">
                      <circle r="26" fill="transparent" class="stroke-boreal-border/40 group-hover:stroke-boreal-blue/60" stroke-width="1.5"></circle>
                      <circle r="20" [class]="statusFill(doc.status)" stroke="currentColor" stroke-width="1"></circle>
                      <text y="-36" text-anchor="middle" class="fill-boreal-text-muted" style="font-size: 8px; font-weight: 700; letter-spacing: 0.28em;">
                        {{ doc.order.toString().padStart(2, '0') }}
                      </text>
                      <text y="5" text-anchor="middle" class="fill-boreal-text-primary select-none" style="font-size: 8px; font-weight: 800;">
                        {{ doc.order === 0 ? 'INDEX' : doc.title.split(' ')[0].toUpperCase() }}
                      </text>
                      <text y="34" text-anchor="middle" class="fill-boreal-text-muted select-none" style="font-size: 6px; letter-spacing: 0.2em;">
                        {{ REFERENCE_STATUS_LABELS[doc.status] }}
                      </text>
                    </a>
                  </g>
                }
              </svg>
            </div>
          </div>

          <aside class="flex flex-col gap-6">
            <section class="rounded-sm border border-boreal-border bg-boreal-panel p-5 shadow-2xl">
              <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">Status legend</div>
              <div class="mt-4 space-y-3">
                @for (status of REFERENCE_STATUS_ORDER; track status) {
                  <div class="flex items-center justify-between gap-4">
                    <div class="inline-flex items-center gap-3">
                      <span class="h-3 w-3 rounded-full border" [ngClass]="statusClass(status)"></span>
                      <span class="text-[10px] font-bold uppercase tracking-tight text-boreal-text-primary">{{ REFERENCE_STATUS_LABELS[status] }}</span>
                    </div>
                    <span class="text-[10px] font-mono text-boreal-text-muted">{{ countByStatus(status) }}</span>
                  </div>
                }
              </div>
            </section>

            <section class="rounded-sm border border-boreal-border bg-boreal-panel p-5 shadow-2xl">
              <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">How to read it</div>
              <ul class="mt-4 space-y-3 text-[11px] leading-relaxed text-boreal-text-secondary">
                <li>Click a node to open the corresponding article.</li>
                <li>Use the sidebar to browse the complete 00-12 backbone.</li>
                <li>Read the status labels as repo truth, not aspiration.</li>
                <li>The graph links are intentionally sparse so the structure stays legible.</li>
              </ul>
            </section>
          </aside>
        </section>
      </div>
    </div>
  `,
})
export class ReferenceIndexPage {
  docs = REFERENCE_DOCS;
  REFERENCE_STATUS_LABELS = REFERENCE_STATUS_LABELS_MAP;
  REFERENCE_STATUS_ORDER = REFERENCE_STATUS_ORDER_VALUES;
  title = inject(Title);

  constructor() {
    this.title.setTitle('BDT Reference');
  }

  graphEdges = computed(() => buildReferenceGraphEdges(this.docs));

  edgeKey(a: string, b: string): string {
    return [a, b].sort().join('::');
  }

  countByStatus(status: typeof REFERENCE_STATUS_ORDER_VALUES[number]): number {
    return this.docs.filter(doc => doc.status === status).length;
  }

  statusClass(status: typeof REFERENCE_STATUS_ORDER_VALUES[number]): string {
    return REFERENCE_STATUS_CLASSES[status];
  }

  statusFill(status: typeof REFERENCE_STATUS_ORDER_VALUES[number]): string {
    switch (status) {
      case 'implemented':
        return 'fill-boreal-green text-boreal-green';
      case 'mock-simulation':
        return 'fill-boreal-blue text-boreal-blue';
      case 'partial':
        return 'fill-boreal-amber text-boreal-amber';
      default:
        return 'fill-boreal-text-muted text-boreal-text-muted';
    }
  }
}
