import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  REFERENCE_DOCS,
  REFERENCE_STATUS_CLASSES,
  REFERENCE_STATUS_LABELS as REFERENCE_STATUS_LABELS_MAP,
  ReferenceDoc,
  getReferenceDoc,
} from './reference.manifest';
import { Title } from '@angular/platform-browser';
import { inject } from '@angular/core';

@Component({
  selector: 'app-reference-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (doc; as doc) {
      <div class="h-full w-full overflow-y-auto bg-boreal-canvas">
        <div class="mx-auto flex min-h-full w-full max-w-[1200px] flex-col gap-6 p-6">
          <header class="rounded-sm border border-boreal-border bg-boreal-panel shadow-2xl">
            <div class="flex flex-col gap-4 border-b border-boreal-border px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="mb-3 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-boreal-text-muted">
                  <mat-icon class="!text-[12px] !w-3 !h-3">description</mat-icon>
                  {{ doc.order.toString().padStart(2, '0') }} / {{ REFERENCE_STATUS_LABELS[doc.status] }}
                </div>
                <h2 class="text-3xl font-semibold tracking-tight text-boreal-text-primary">{{ doc.title }}</h2>
                <p class="mt-3 max-w-3xl text-[12px] leading-relaxed text-boreal-text-secondary">
                  {{ doc.summary }}
                </p>
              </div>
              <div class="flex shrink-0 gap-2">
                <a routerLink="/reference" class="rounded-sm border border-boreal-border px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-boreal-text-muted hover:bg-boreal-panel-muted/30">
                  Graph
                </a>
                @if (previousDoc(); as prev) {
                  <a [routerLink]="prev.route" class="rounded-sm border border-boreal-border px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-boreal-text-muted hover:bg-boreal-panel-muted/30">
                    Prev
                  </a>
                }
                @if (nextDoc(); as next) {
                  <a [routerLink]="next.route" class="rounded-sm border border-boreal-border px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-boreal-text-muted hover:bg-boreal-panel-muted/30">
                    Next
                  </a>
                }
              </div>
            </div>

            <div class="grid gap-px bg-boreal-border md:grid-cols-3">
              <div class="bg-boreal-panel px-5 py-4">
                <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">Status</div>
                <div class="mt-1 inline-flex rounded-sm border px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em]" [ngClass]="statusClass(doc.status)">
                  {{ REFERENCE_STATUS_LABELS[doc.status] }}
                </div>
              </div>
              <div class="bg-boreal-panel px-5 py-4">
                <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">Related</div>
                <div class="mt-1 text-sm font-bold">{{ doc.related.length }}</div>
              </div>
              <div class="bg-boreal-panel px-5 py-4">
                <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">Sources</div>
                <div class="mt-1 text-sm font-bold">{{ doc.sources.length }}</div>
              </div>
            </div>
          </header>

          <div class="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <main class="space-y-6">
              @for (section of doc.sections; track section.title) {
                <section class="rounded-sm border border-boreal-border bg-boreal-panel p-5 shadow-2xl">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">{{ section.title }}</div>
                  <p class="mt-3 max-w-3xl text-[12px] leading-relaxed text-boreal-text-secondary">{{ section.summary }}</p>
                  <ul class="mt-4 space-y-2">
                    @for (bullet of section.bullets; track bullet) {
                      <li class="flex items-start gap-3 text-[11px] leading-relaxed text-boreal-text-primary">
                        <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-boreal-blue"></span>
                        <span>{{ bullet }}</span>
                      </li>
                    }
                  </ul>
                </section>
              }
            </main>

            <aside class="space-y-6">
              <section class="rounded-sm border border-boreal-border bg-boreal-panel p-5 shadow-2xl">
                <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">Source anchors</div>
                <div class="mt-4 space-y-3">
                  @for (source of doc.sources; track source.path) {
                    <div class="rounded-sm border border-boreal-border/60 bg-boreal-canvas/40 p-3">
                      <div class="text-[10px] font-black uppercase tracking-tight text-boreal-text-primary">{{ source.label }}</div>
                      <code class="mt-1 block break-all text-[10px] text-boreal-blue">{{ source.path }}</code>
                      <p class="mt-2 text-[10px] leading-relaxed text-boreal-text-muted">{{ source.note }}</p>
                    </div>
                  }
                </div>
              </section>

              <section class="rounded-sm border border-boreal-border bg-boreal-panel p-5 shadow-2xl">
                <div class="text-[8px] font-black uppercase tracking-[0.24em] text-boreal-text-muted">Related pages</div>
                <div class="mt-4 flex flex-wrap gap-2">
                  @for (slug of doc.related; track slug) {
                    @if (relatedDoc(slug); as related) {
                      <a [routerLink]="related.route" class="rounded-sm border border-boreal-border px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted hover:bg-boreal-panel-muted/30">
                        {{ related.order.toString().padStart(2, '0') }} {{ related.title }}
                      </a>
                    }
                  }
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    }
  `,
})
export class ReferencePage {
  private route = inject(ActivatedRoute);
  private title = inject(Title);

  REFERENCE_STATUS_LABELS = REFERENCE_STATUS_LABELS_MAP;
  doc: ReferenceDoc | null = null;

  constructor() {
    const slug = String((this.route.snapshot.data as Record<string, unknown>)['slug'] ?? '');
    const doc = getReferenceDoc(slug);
    if (doc) {
      this.doc = doc;
      this.title.setTitle(`SSS Reference · ${doc.title}`);
    } else {
      this.title.setTitle('SSS Reference');
    }
  }

  previousDoc() {
    const doc = this.doc;
    if (!doc) return null;
    return REFERENCE_DOCS.find(candidate => candidate.order === doc.order - 1) ?? null;
  }

  nextDoc() {
    const doc = this.doc;
    if (!doc) return null;
    return REFERENCE_DOCS.find(candidate => candidate.order === doc.order + 1) ?? null;
  }

  relatedDoc(slug: string) {
    return getReferenceDoc(slug) ?? null;
  }

  statusClass(status: keyof typeof REFERENCE_STATUS_CLASSES) {
    return REFERENCE_STATUS_CLASSES[status];
  }
}
