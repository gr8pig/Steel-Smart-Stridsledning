import { Injectable, inject } from '@angular/core';
import { signal, computed } from '@angular/core';
import {
  ForceCatalogService,
  ForceCatalogSummary,
  PlatformInfo,
  EffectorSpec,
  DoctrineProfile,
  ForceUnit,
} from '../services/force-catalog.service';

export interface ForceCatalogState {
  platformsLoaded: boolean;
  effectorsLoaded: boolean;
  doctrinesLoaded: boolean;
  browseDataLoaded?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ForceCatalogStore {
  private catalog = inject(ForceCatalogService);

  private _platforms = signal<Record<string, PlatformInfo> | null>(null);
  private _effectors = signal<Record<string, EffectorSpec> | null>(null);
  private _doctrines = signal<Record<string, DoctrineProfile> | null>(null);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _summary = signal<ForceCatalogSummary | null>(null);
  private _forces = signal<ForceUnit[] | null>(null);
  private _sources = signal<unknown[] | null>(null);
  private _crossCutting = signal<Record<string, unknown> | null>(null);
  private _sensitiveOverrides = signal<Record<string, unknown> | null>(null);
  private _declassifiedContext = signal<Record<string, unknown> | null>(null);
  private _browseLoading = signal<boolean>(false);
  private _browseError = signal<string | null>(null);

  platforms = computed(() => this._platforms());
  effectors = computed(() => this._effectors());
  doctrines = computed(() => this._doctrines());
  loading = computed(() => this._loading());
  error = computed(() => this._error());
  summary = computed(() => this._summary());
  forces = computed(() => this._forces() ?? []);
  sources = computed(() => this._sources() ?? []);
  crossCutting = computed(() => this._crossCutting());
  sensitiveOverrides = computed(() => this._sensitiveOverrides());
  declassifiedContext = computed(() => this._declassifiedContext());
  browseLoading = computed(() => this._browseLoading());
  browseError = computed(() => this._browseError());

  platformList = computed(() => {
    const p = this._platforms();
    if (!p) return [];
    const result: (PlatformInfo & { id: string })[] = [];
    for (const [id, info] of Object.entries(p)) {
      result.push({ id, display_name: info.display_name, nation: info.nation, type: info.type, threat_class: info.threat_class, origin_country: info.origin_country, armaments: info.armaments, armament: info.armament, max_speed_kmh: info.max_speed_kmh, combat_radius_km: info.combat_radius_km, service_ceiling_m: info.service_ceiling_m, radar_range_km: info.radar_range_km });
    }
    return result;
  });

  platformsByNation = computed(() => {
    const list = this.platformList();
    const grouped: Record<string, (PlatformInfo & { id: string })[]> = {};
    for (const plat of list) {
      const nation = plat.origin_country ?? 'OTHER';
      (grouped[nation] ??= []).push(plat);
    }
    return grouped;
  });

  platformsByThreatClass = computed(() => {
    const list = this.platformList();
    const grouped: Record<string, (PlatformInfo & { id: string })[]> = {};
    for (const plat of list) {
      const tc = plat.threat_class ?? 'UNKNOWN';
      (grouped[tc] ??= []).push(plat);
    }
    return grouped;
  });

  forceList = computed(() => {
    return [...this.forces()].sort((a, b) => {
      const groupCompare = a._force.localeCompare(b._force);
      if (groupCompare !== 0) return groupCompare;
      const categoryCompare = a._category.localeCompare(b._category);
      if (categoryCompare !== 0) return categoryCompare;
      return a._id.localeCompare(b._id);
    });
  });

  loadAll(): void {
    if (this._platforms() && this._effectors() && this._doctrines()) return;
    this._loading.set(true);
    this._error.set(null);

    let loaded = 0;
    const checkDone = () => {
      loaded++;
      if (loaded >= 3) {
        this._loading.set(false);
      }
    };

    this.catalog.getPlatforms().subscribe({
      next: (data) => { this._platforms.set(data); checkDone(); },
      error: (err) => { this._error.set(String(err)); checkDone(); },
    });

    this.catalog.getEffectors().subscribe({
      next: (data) => { this._effectors.set(data); checkDone(); },
      error: (err) => { this._error.set(String(err)); checkDone(); },
    });

    this.catalog.getDoctrines().subscribe({
      next: (data) => { this._doctrines.set(data); checkDone(); },
      error: (err) => { this._error.set(String(err)); checkDone(); },
    });
  }

  loadBrowseData(): void {
    if (this._summary() && this._forces() && this._sources() && this._crossCutting() && this._sensitiveOverrides() && this._declassifiedContext()) {
      return;
    }

    this._browseLoading.set(true);
    this._browseError.set(null);

    let loaded = 0;
    const checkDone = () => {
      loaded++;
      if (loaded >= 6) {
        this._browseLoading.set(false);
      }
    };

    this.catalog.getSummary().subscribe({
      next: (data) => { this._summary.set(data); checkDone(); },
      error: (err) => { this._browseError.set(String(err)); checkDone(); },
    });

    this.catalog.getForces().subscribe({
      next: (data) => { this._forces.set(data); checkDone(); },
      error: (err) => { this._browseError.set(String(err)); checkDone(); },
    });

    this.catalog.getSources().subscribe({
      next: (data) => { this._sources.set(data); checkDone(); },
      error: (err) => { this._browseError.set(String(err)); checkDone(); },
    });

    this.catalog.getCrossCutting().subscribe({
      next: (data) => { this._crossCutting.set(data); checkDone(); },
      error: (err) => { this._browseError.set(String(err)); checkDone(); },
    });

    this.catalog.getSensitiveOverrides().subscribe({
      next: (data) => { this._sensitiveOverrides.set(data); checkDone(); },
      error: (err) => { this._browseError.set(String(err)); checkDone(); },
    });

    this.catalog.getDeclassifiedContext().subscribe({
      next: (data) => { this._declassifiedContext.set(data); checkDone(); },
      error: (err) => { this._browseError.set(String(err)); checkDone(); },
    });
  }

  getPlatform(id: string): (PlatformInfo & { id: string }) | null {
    const p = this._platforms();
    if (!p || !(id in p)) return null;
    const data = p[id];
    if (!data) return null;
    return { id, display_name: data.display_name, nation: data.nation, type: data.type, threat_class: data.threat_class, origin_country: data.origin_country, armaments: data.armaments, armament: data.armament, max_speed_kmh: data.max_speed_kmh, combat_radius_km: data.combat_radius_km, service_ceiling_m: data.service_ceiling_m, radar_range_km: data.radar_range_km };
  }

  getForceUnit(id: string): ForceUnit | null {
    return this.forces().find((unit) => unit._id === id) ?? null;
  }
}
