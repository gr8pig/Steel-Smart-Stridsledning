import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { API_BASE_URL } from '../tokens/api.token';
import { ArmamentType, ArmamentLoadout, OriginCountry, PlatformType } from '../../shared/domain/models';

export interface ForceCatalogSummary {
  metadata: {
    title: string;
    generated_at: string;
    scope: string;
  };
  unitCount: number;
  forceCount: number;
  forceGroupCount: number;
  categoryCount: number;
  platformCount: number;
  platforms: number;
  sourceCount: number;
}

export interface PlatformInfo {
  id: string;
  display_name: string;
  nation: string;
  type: string;
  threat_class: string;
  origin_country: OriginCountry;
  armaments: ArmamentType[];
  armament: ArmamentLoadout | null;
  max_speed_kmh: number;
  combat_radius_km: number;
  service_ceiling_m: number;
  radar_range_km: number;
}

export interface EffectorSpec {
  range_km: number;
  speed_km_s: number;
  pk: Record<string, number>;
  cost_units: number;
  catalog_ref: string;
  note: string;
}

export interface DoctrineProfile {
  style: string;
  threat_intent_bias: Record<string, number>;
  description: string;
}

export interface ThreatClassVelocity {
  typical_velocity_kmh: number;
  velocity_range_kmh: [number, number];
}

export interface ForceUnit {
  _id: string;
  _force: string;
  _category: string;
  _platform_id?: PlatformType | null;
  _platform_profile?: (PlatformInfo & { id: string }) | null;
  _threat_class?: string | null;
  _origin_country?: OriginCountry | null;
  source_ids?: string[];
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class ForceCatalogService {
  private http = inject(HttpClient);
  private apiBase = inject(API_BASE_URL);

  private _platforms: Map<string, PlatformInfo> | null = null;
  private _effectors: Record<string, EffectorSpec> | null = null;
  private _doctrines: Record<string, DoctrineProfile> | null = null;
  private _velocities: Record<string, ThreatClassVelocity> | null = null;
  private _summary: ForceCatalogSummary | null = null;

  private _platforms$: Observable<Record<string, PlatformInfo>> | null = null;
  private _effectors$: Observable<Record<string, EffectorSpec>> | null = null;
  private _doctrines$: Observable<Record<string, DoctrineProfile>> | null = null;
  private _summary$: Observable<ForceCatalogSummary> | null = null;
  private _forces$: Observable<ForceUnit[]> | null = null;
  private _crossCutting$: Observable<Record<string, unknown>> | null = null;
  private _sources$: Observable<unknown[]> | null = null;
  private _sensitiveOverrides$: Observable<Record<string, unknown>> | null = null;
  private _declassifiedContext$: Observable<Record<string, unknown>> | null = null;

  getPlatforms(): Observable<Record<string, PlatformInfo>> {
    if (!this._platforms$) {
      this._platforms$ = this.http.get<Record<string, PlatformInfo>>(
        `${this.apiBase}/force-catalog/platforms`
      ).pipe(shareReplay(1));
    }
    return this._platforms$;
  }

  getPlatform(id: string): Observable<PlatformInfo & { id: string }> {
    return this.http.get<PlatformInfo & { id: string }>(
      `${this.apiBase}/force-catalog/platforms/${id}`
    );
  }

  getEffectors(): Observable<Record<string, EffectorSpec>> {
    if (!this._effectors$) {
      this._effectors$ = this.http.get<Record<string, EffectorSpec>>(
        `${this.apiBase}/force-catalog/effectors`
      ).pipe(shareReplay(1));
    }
    return this._effectors$;
  }

  getDoctrines(): Observable<Record<string, DoctrineProfile>> {
    if (!this._doctrines$) {
      this._doctrines$ = this.http.get<Record<string, DoctrineProfile>>(
        `${this.apiBase}/force-catalog/doctrines`
      ).pipe(shareReplay(1));
    }
    return this._doctrines$;
  }

  getVelocities(): Observable<Record<string, ThreatClassVelocity>> {
    return this.http.get<Record<string, ThreatClassVelocity>>(
      `${this.apiBase}/force-catalog/velocities`
    );
  }

  getForces(nation?: string, category?: string): Observable<ForceUnit[]> {
    const params: Record<string, string> = {};
    if (nation) params['nation'] = nation;
    if (category) params['category'] = category;
    if (!nation && !category) {
      if (!this._forces$) {
        this._forces$ = this.http.get<ForceUnit[]>(`${this.apiBase}/force-catalog/forces`).pipe(shareReplay(1));
      }
      return this._forces$;
    }
    return this.http.get<ForceUnit[]>(`${this.apiBase}/force-catalog/forces`, { params });
  }

  getUnit(unitId: string): Observable<ForceUnit> {
    return this.http.get<ForceUnit>(`${this.apiBase}/force-catalog/forces/${unitId}`);
  }

  getCrossCutting(): Observable<Record<string, unknown>> {
    if (!this._crossCutting$) {
      this._crossCutting$ = this.http.get<Record<string, unknown>>(`${this.apiBase}/force-catalog/cross-cutting`).pipe(shareReplay(1));
    }
    return this._crossCutting$;
  }

  getSources(): Observable<unknown[]> {
    if (!this._sources$) {
      this._sources$ = this.http.get<unknown[]>(`${this.apiBase}/force-catalog/sources`).pipe(shareReplay(1));
    }
    return this._sources$;
  }

  getSensitiveOverrides(): Observable<Record<string, unknown>> {
    if (!this._sensitiveOverrides$) {
      this._sensitiveOverrides$ = this.http.get<Record<string, unknown>>(`${this.apiBase}/force-catalog/sensitive-overrides`).pipe(shareReplay(1));
    }
    return this._sensitiveOverrides$;
  }

  getDeclassifiedContext(): Observable<Record<string, unknown>> {
    if (!this._declassifiedContext$) {
      this._declassifiedContext$ = this.http.get<Record<string, unknown>>(`${this.apiBase}/force-catalog/declassified-context`).pipe(shareReplay(1));
    }
    return this._declassifiedContext$;
  }

  getSummary(): Observable<ForceCatalogSummary> {
    if (!this._summary$) {
      this._summary$ = this.http.get<ForceCatalogSummary>(`${this.apiBase}/force-catalog`).pipe(shareReplay(1));
    }
    return this._summary$;
  }
}
