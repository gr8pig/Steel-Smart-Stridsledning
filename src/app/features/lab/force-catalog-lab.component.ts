import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { ForceUnit } from '../../core/services/force-catalog.service';
import { DrawingBoardStore, DrawingSide } from '../../core/state/drawing-board.store';
import { ForceCatalogStore } from '../../core/state/force-catalog.store';
import { OriginCountry } from '../../shared/domain/models';

interface ForceSourceEntry {
  id: string;
  title: string;
  url: string;
  source_category?: string;
}

interface BottomLineEntry {
  statement: string;
  confidence?: string;
  releasability?: string;
}

interface DetailRow {
  label: string;
  value: string;
}

function normalizeSearch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function formatCatalogKey(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((token) => token.length <= 3 || /\d/.test(token)
      ? token.toUpperCase()
      : token[0].toUpperCase() + token.slice(1).toLowerCase())
    .join(' ');
}

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(', ');
  }
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return null;
}

function isSourceEntry(value: unknown): value is ForceSourceEntry {
  return typeof value === 'object' && value !== null && 'id' in value && 'title' in value && 'url' in value;
}

function isBottomLineEntry(value: unknown): value is BottomLineEntry {
  return typeof value === 'object' && value !== null && 'statement' in value;
}

@Component({
  selector: 'app-force-catalog-lab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full w-full overflow-hidden bg-boreal-canvas text-boreal-text-primary">
      <div class="flex h-full min-h-0 flex-col gap-5 p-6">
        <header class="flex flex-col gap-4 border-b border-boreal-border pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-1">
            <div class="text-[8px] font-black uppercase tracking-[0.35em] text-boreal-text-muted">Open Source Force Dataset</div>
            <h1 class="text-3xl font-black uppercase tracking-tight text-boreal-text-primary">Force Catalog Lab</h1>
            <p class="max-w-3xl text-[10px] font-mono uppercase tracking-[0.2em] text-boreal-text-secondary">
              Browse the full 78-unit catalog, validate releasable sources, and push real platforms into the drawing board and counterfactual lab.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div class="rounded border border-boreal-border bg-boreal-panel/40 px-3 py-2">
              <div class="text-[7px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Units</div>
              <div class="mt-1 text-xl font-mono font-bold text-boreal-blue">{{ catalog.summary()?.unitCount ?? 0 }}</div>
            </div>
            <div class="rounded border border-boreal-border bg-boreal-panel/40 px-3 py-2">
              <div class="text-[7px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Platforms</div>
              <div class="mt-1 text-xl font-mono font-bold text-boreal-text-primary">{{ catalog.summary()?.platformCount ?? 0 }}</div>
            </div>
            <div class="rounded border border-boreal-border bg-boreal-panel/40 px-3 py-2">
              <div class="text-[7px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Sources</div>
              <div class="mt-1 text-xl font-mono font-bold text-boreal-green">{{ catalog.summary()?.sourceCount ?? sourceEntries().length }}</div>
            </div>
            <div class="rounded border border-boreal-border bg-boreal-panel/40 px-3 py-2">
              <div class="text-[7px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Sensitive Gates</div>
              <div class="mt-1 text-xl font-mono font-bold text-boreal-amber">{{ sensitiveTopics().length }}</div>
            </div>
          </div>
        </header>

        @if (catalog.browseError(); as error) {
          <div class="rounded border border-boreal-red/30 bg-boreal-red/5 px-4 py-3 text-[10px] font-mono text-boreal-red">
            {{ error }}
          </div>
        }

        @if (statusMessage(); as status) {
          <div class="rounded border border-boreal-green/30 bg-boreal-green/5 px-4 py-3 text-[10px] font-mono text-boreal-green">
            {{ status }}
          </div>
        }

        <div class="grid min-h-0 flex-1 gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside class="flex min-h-0 flex-col rounded border border-boreal-border bg-boreal-panel/35">
            <div class="border-b border-boreal-border p-4">
              <div class="grid gap-3">
                <label class="grid gap-1 text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">
                  Search
                  <input
                    [ngModel]="search()"
                    (ngModelChange)="search.set($event)"
                    placeholder="Gripen, Kalibr, Patriot"
                    class="rounded border border-boreal-border bg-boreal-canvas px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-boreal-text-primary outline-none transition-all focus:border-boreal-blue/50"
                  />
                </label>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <label class="grid gap-1 text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">
                    Force Group
                    <select
                      [ngModel]="forceFilter()"
                      (ngModelChange)="forceFilter.set($event)"
                      class="rounded border border-boreal-border bg-boreal-canvas px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-boreal-text-primary outline-none">
                      <option value="ALL">All</option>
                      @for (option of forceOptions(); track option) {
                        <option [value]="option">{{ option }}</option>
                      }
                    </select>
                  </label>

                  <label class="grid gap-1 text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">
                    Category
                    <select
                      [ngModel]="categoryFilter()"
                      (ngModelChange)="categoryFilter.set($event)"
                      class="rounded border border-boreal-border bg-boreal-canvas px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-boreal-text-primary outline-none">
                      <option value="ALL">All</option>
                      @for (option of categoryOptions(); track option) {
                        <option [value]="option">{{ option }}</option>
                      }
                    </select>
                  </label>

                  <label class="grid gap-1 text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">
                    Threat Class
                    <select
                      [ngModel]="threatClassFilter()"
                      (ngModelChange)="threatClassFilter.set($event)"
                      class="rounded border border-boreal-border bg-boreal-canvas px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-boreal-text-primary outline-none">
                      <option value="ALL">All</option>
                      @for (option of threatClassOptions(); track option) {
                        <option [value]="option">{{ option }}</option>
                      }
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between border-b border-boreal-border px-4 py-2 text-[8px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">
              <span>{{ filteredUnits().length }} filtered</span>
              <span>{{ catalog.forceList().length }} total</span>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto p-2">
              @if (catalog.browseLoading() && !catalog.forceList().length) {
                <div class="p-4 text-[10px] font-mono uppercase tracking-[0.2em] text-boreal-text-muted">Loading catalog…</div>
              } @else {
                <div class="space-y-2">
                  @for (unit of filteredUnits(); track unit._id) {
                    <button
                      type="button"
                      (click)="selectedUnitId.set(unit._id)"
                      class="w-full rounded border px-3 py-3 text-left transition-all"
                      [class.border-boreal-blue/40]="selectedUnitId() === unit._id"
                      [class.bg-boreal-blue/10]="selectedUnitId() === unit._id"
                      [class.border-boreal-border]="selectedUnitId() !== unit._id"
                      [class.bg-boreal-canvas/35]="selectedUnitId() !== unit._id">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <div class="truncate text-[10px] font-bold uppercase tracking-tight text-boreal-text-primary">
                            {{ unit._platform_profile?.display_name || formatKey(unit._id) }}
                          </div>
                          <div class="mt-1 text-[8px] font-mono uppercase tracking-[0.18em] text-boreal-text-muted">
                            {{ formatKey(unit._force) }} · {{ formatKey(unit._category) }}
                          </div>
                        </div>
                        @if (unit._platform_id) {
                          <span class="rounded-sm border border-boreal-blue/20 bg-boreal-blue/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-boreal-blue">
                            {{ unit._threat_class || 'mapped' }}
                          </span>
                        }
                      </div>
                    </button>
                  }
                </div>
              }
            </div>
          </aside>

          <main class="min-h-0 overflow-y-auto rounded border border-boreal-border bg-boreal-panel/35 p-5">
            @if (selectedUnit(); as unit) {
              <div class="flex flex-col gap-5">
                <section class="flex flex-col gap-4 rounded border border-boreal-border bg-boreal-canvas/35 p-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div class="text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Selected Unit</div>
                    <h2 class="mt-1 text-2xl font-black uppercase tracking-tight text-boreal-text-primary">
                      {{ unit._platform_profile?.display_name || formatKey(unit._id) }}
                    </h2>
                    <div class="mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-boreal-text-secondary">
                      {{ formatKey(unit._force) }} · {{ formatKey(unit._category) }}
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      @if (unit._platform_id) {
                        <span class="rounded-sm border border-boreal-blue/20 bg-boreal-blue/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-boreal-blue">
                          {{ unit._platform_id }}
                        </span>
                      }
                      @if (unit._origin_country) {
                        <span class="rounded-sm border border-boreal-border bg-boreal-panel-muted/30 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">
                          {{ unit._origin_country }}
                        </span>
                      }
                      @if (unit._threat_class) {
                        <span class="rounded-sm border border-boreal-border bg-boreal-panel-muted/30 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">
                          {{ unit._threat_class }}
                        </span>
                      }
                    </div>
                  </div>

                  <div class="grid gap-2 sm:grid-cols-3 lg:w-[26rem]">
                    <button
                      type="button"
                      (click)="queueOnBoard('BLUE')"
                      class="rounded border border-boreal-blue/30 bg-boreal-blue/10 px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-boreal-blue transition-all hover:bg-boreal-blue/20">
                      Queue Blue
                    </button>
                    <button
                      type="button"
                      (click)="queueOnBoard('RED')"
                      class="rounded border border-boreal-red/30 bg-boreal-red/10 px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-boreal-red transition-all hover:bg-boreal-red/20">
                      Queue Red
                    </button>
                    <button
                      type="button"
                      (click)="stageForCounterfactual()"
                      class="rounded border border-boreal-green/30 bg-boreal-green/10 px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-boreal-green transition-all hover:bg-boreal-green/20">
                      Stage In Lab
                    </button>
                  </div>
                </section>

                <section class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
                  <div class="grid gap-4 md:grid-cols-2">
                    <div class="rounded border border-boreal-border bg-boreal-canvas/35 p-4">
                      <div class="text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Platform Profile</div>
                      <div class="mt-3 grid gap-3 sm:grid-cols-2">
                        @for (row of detailRows(); track row.label) {
                          <div>
                            <div class="text-[7px] font-black uppercase tracking-[0.25em] text-boreal-text-muted">{{ row.label }}</div>
                            <div class="mt-1 text-[11px] font-mono text-boreal-text-primary">{{ row.value }}</div>
                          </div>
                        }
                      </div>
                    </div>

                    <div class="rounded border border-boreal-border bg-boreal-canvas/35 p-4">
                      <div class="text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Release Discipline</div>
                      <div class="mt-3 space-y-3 text-[10px] text-boreal-text-secondary">
                        @if (bottomLine().length) {
                          @for (item of bottomLine(); track item.statement) {
                            <div class="rounded border border-boreal-border bg-boreal-panel/35 p-3">
                              <div class="leading-relaxed">{{ item.statement }}</div>
                              <div class="mt-2 text-[8px] font-mono uppercase tracking-[0.18em] text-boreal-text-muted">
                                {{ item.releasability || 'public_intelligence_assessment' }} · {{ item.confidence || 'n/a' }} confidence
                              </div>
                            </div>
                          }
                        } @else {
                          <div class="text-[10px] font-mono uppercase tracking-[0.18em] text-boreal-text-muted">Context loading…</div>
                        }
                      </div>
                    </div>
                  </div>

                  <div class="rounded border border-boreal-border bg-boreal-canvas/35 p-4">
                    <div class="flex items-center justify-between">
                      <div class="text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Smoke Gates</div>
                      <span class="text-[8px] font-mono uppercase tracking-[0.18em] text-boreal-text-muted">{{ sensitiveTopics().length }} restricted topics</span>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      @for (topic of sensitiveTopics(); track topic) {
                        <span class="rounded-sm border border-boreal-amber/20 bg-boreal-amber/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-boreal-amber">
                          {{ formatKey(topic) }}
                        </span>
                      }
                    </div>

                    @if (notIncludedCategories().length) {
                      <div class="mt-4 border-t border-boreal-border pt-4">
                        <div class="text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Not Included</div>
                        <div class="mt-2 flex flex-wrap gap-2">
                          @for (item of notIncludedCategories(); track item) {
                            <span class="rounded-sm border border-boreal-border bg-boreal-panel-muted/30 px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-boreal-text-muted">
                              {{ item }}
                            </span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </section>

                <section class="rounded border border-boreal-border bg-boreal-canvas/35 p-4">
                  <div class="flex items-center justify-between">
                    <div class="text-[8px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Traceable Sources</div>
                    <span class="text-[8px] font-mono uppercase tracking-[0.18em] text-boreal-text-muted">{{ selectedSources().length }} linked refs</span>
                  </div>

                  @if (selectedSources().length) {
                    <div class="mt-3 grid gap-3 xl:grid-cols-2">
                      @for (source of selectedSources(); track source.id) {
                        <a
                          [href]="source.url"
                          target="_blank"
                          rel="noreferrer"
                          class="rounded border border-boreal-border bg-boreal-panel/35 p-3 transition-all hover:border-boreal-blue/30 hover:bg-boreal-blue/5">
                          <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">{{ source.id }}</div>
                          <div class="mt-1 text-[11px] font-semibold text-boreal-text-primary">{{ source.title }}</div>
                          <div class="mt-2 text-[8px] font-mono uppercase tracking-[0.18em] text-boreal-text-muted">{{ source.source_category || 'official_public_or_osint' }}</div>
                        </a>
                      }
                    </div>
                  } @else {
                    <div class="mt-3 text-[10px] font-mono uppercase tracking-[0.18em] text-boreal-text-muted">
                      No explicit source ids are attached to this unit entry.
                    </div>
                  }
                </section>
              </div>
            } @else {
              <div class="flex h-full items-center justify-center rounded border border-dashed border-boreal-border bg-boreal-panel/20">
                <div class="text-center">
                  <div class="text-[10px] font-black uppercase tracking-[0.3em] text-boreal-text-muted">Force Catalog</div>
                  <div class="mt-2 text-lg font-semibold text-boreal-text-primary">Select a unit to inspect its platform mapping and sources.</div>
                </div>
              </div>
            }
          </main>
        </div>
      </div>
    </div>
  `,
})
export class ForceCatalogLabComponent {
  readonly catalog = inject(ForceCatalogStore);
  private readonly drawingBoard = inject(DrawingBoardStore);
  private readonly router = inject(Router);

  readonly search = signal('');
  readonly forceFilter = signal('ALL');
  readonly categoryFilter = signal('ALL');
  readonly threatClassFilter = signal('ALL');
  readonly selectedUnitId = signal<string | null>(null);
  readonly statusMessage = signal<string | null>(null);

  readonly sourceEntries = computed(() => this.catalog.sources().filter(isSourceEntry));
  readonly sourceMap = computed(() => new Map(this.sourceEntries().map((entry) => [entry.id, entry])));
  readonly forceOptions = computed(() => [...new Set(this.catalog.forceList().map((unit) => formatCatalogKey(unit._force)))]);
  readonly categoryOptions = computed(() => [...new Set(this.catalog.forceList().map((unit) => formatCatalogKey(unit._category)))]);
  readonly threatClassOptions = computed(() => [...new Set(this.catalog.forceList().map((unit) => unit._threat_class || 'UNKNOWN'))]);
  readonly sensitiveTopics = computed(() => Object.keys(this.catalog.sensitiveOverrides() ?? {}));
  readonly notIncludedCategories = computed(() => {
    const items = this.catalog.declassifiedContext()?.['not_included_categories'];
    return Array.isArray(items) ? items.map((item) => String(item)) : [];
  });
  readonly bottomLine = computed(() => {
    const items = this.catalog.declassifiedContext()?.['bottom_line'];
    return Array.isArray(items) ? items.filter(isBottomLineEntry).slice(0, 3) : [];
  });

  readonly filteredUnits = computed(() => {
    const search = normalizeSearch(this.search());
    const forceFilter = this.forceFilter();
    const categoryFilter = this.categoryFilter();
    const threatClassFilter = this.threatClassFilter();

    return this.catalog.forceList().filter((unit) => {
      const matchesSearch = !search || normalizeSearch([
        unit._id,
        unit._force,
        unit._category,
        unit._platform_id ?? '',
        unit._platform_profile?.display_name ?? '',
      ].join(' ')).includes(search);
      const matchesForce = forceFilter === 'ALL' || formatCatalogKey(unit._force) === forceFilter;
      const matchesCategory = categoryFilter === 'ALL' || formatCatalogKey(unit._category) === categoryFilter;
      const matchesThreatClass = threatClassFilter === 'ALL' || (unit._threat_class || 'UNKNOWN') === threatClassFilter;
      return matchesSearch && matchesForce && matchesCategory && matchesThreatClass;
    });
  });

  readonly selectedUnit = computed(() => {
    const id = this.selectedUnitId();
    if (!id) return null;
    return this.catalog.getForceUnit(id);
  });

  readonly selectedSources = computed(() => {
    const unit = this.selectedUnit();
    const ids = Array.isArray(unit?.source_ids) ? unit.source_ids : [];
    return ids
      .map((id) => this.sourceMap().get(id))
      .filter((entry): entry is ForceSourceEntry => !!entry);
  });

  readonly detailRows = computed<DetailRow[]>(() => {
    const unit = this.selectedUnit();
    if (!unit) return [];

    const profile = unit._platform_profile;
    const rows: [string, unknown][] = [
      ['Force Group', formatCatalogKey(unit._force)],
      ['Category', formatCatalogKey(unit._category)],
      ['Platform Id', unit._platform_id],
      ['Display Name', profile?.display_name],
      ['Origin', profile?.origin_country ?? unit._origin_country],
      ['Threat Class', profile?.threat_class ?? unit._threat_class],
      ['Max Speed', profile?.max_speed_kmh ?? unit['max_speed']],
      ['Combat Radius', profile?.combat_radius_km ?? unit['combat_radius']],
      ['Service Ceiling', profile?.service_ceiling_m ?? unit['service_ceiling']],
      ['Radar Range', profile?.radar_range_km ?? unit['radar_public_detection_range_fighter'] ?? unit['engagement_range']],
      ['Armaments', profile?.armaments],
      ['Loadout', profile?.armament],
    ];

    return rows
      .map(([label, value]) => {
        const formatted = formatValue(value);
        return formatted ? { label, value: formatted } : null;
      })
      .filter((row): row is DetailRow => !!row);
  });

  constructor() {
    this.catalog.loadAll();
    this.catalog.loadBrowseData();

    effect(() => {
      const units = this.filteredUnits();
      const selectedId = this.selectedUnitId();
      if (!units.length) {
        this.selectedUnitId.set(null);
        return;
      }
      if (!selectedId || !units.some((unit) => unit._id === selectedId)) {
        this.selectedUnitId.set(units[0]?._id ?? null);
      }
    }, { allowSignalWrites: true });
  }

  formatKey(value: string): string {
    return formatCatalogKey(value);
  }

  queueOnBoard(side: DrawingSide): void {
    const unit = this.selectedUnit();
    if (!unit) return;
    const placedId = this.drawingBoard.addCatalogUnit(unit, side);
    this.statusMessage.set(`${unit._platform_profile?.display_name || formatCatalogKey(unit._id)} queued on the ${side.toLowerCase()} side as ${placedId}.`);
  }

  stageForCounterfactual(): void {
    const unit = this.selectedUnit();
    if (!unit) return;
    const side = this.defaultSide(unit);
    const placedId = this.drawingBoard.addCatalogUnit(unit, side);
    this.statusMessage.set(`${unit._platform_profile?.display_name || formatCatalogKey(unit._id)} staged as ${placedId}; opening counterfactual lab.`);
    this.router.navigate(['/lab/counterfactual']);
  }

  private defaultSide(unit: ForceUnit): DrawingSide {
    const origin = (unit._platform_profile?.origin_country ?? unit._origin_country ?? 'OTHER') as OriginCountry;
    return origin === 'SWEDEN' || origin === 'NATO' ? 'BLUE' : 'RED';
  }
}
