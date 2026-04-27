import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { LogisticsStore } from '../../core/state/logistics.store';
import { ReadinessStore } from '../../core/state/readiness.store';
import { PolicyStore } from '../../core/state/policy.store';
import { MapLayerStore } from '../../core/state/map-layer.store';
import { LLMService } from '../../core/services/llm.service';
import { AuditLogger } from '../../core/services/audit-logger';
import { ENGAGEMENT_MAP_FEATURES } from '../../shared/domain/engagement-map.data';
import { SupplyNode, SupplyCorridor, ReinforcementGroup } from '../../shared/domain/logistics-ontology';

@Component({
  selector: 'app-logistics-console',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="logistics-shell boreal-map-surface h-full w-full flex overflow-hidden">

      <!-- Left Panel: Supply Node Status -->
      <div class="logistics-panel logistics-panel--left w-80 border-r border-boreal-border bg-boreal-panel flex flex-col z-20 shadow-2xl">
        <div class="panel-header uppercase tracking-widest text-[10px] text-boreal-text-muted flex items-center justify-between">
          <span>Supply Nodes</span>
          <span class="px-1.5 py-0.5 rounded text-[8px] font-black"
            [class.bg-boreal-green/10]="logistics.supplyHealth() > 0.7"
            [class.text-boreal-green]="logistics.supplyHealth() > 0.7"
            [class.bg-boreal-amber/10]="logistics.supplyHealth() <= 0.7"
            [class.text-boreal-amber]="logistics.supplyHealth() <= 0.7">
            HEALTH {{ (logistics.supplyHealth() * 100 | number:'1.0-0') }}%
          </span>
        </div>

        <div class="flex-grow overflow-y-auto">
          @for (node of logistics.supplyNodes(); track node.id) {
            <div class="p-4 border-b border-boreal-border hover:bg-boreal-panel-muted/30 transition-colors cursor-pointer"
                 (click)="selectNode(node.id)"
                 tabindex="0"
                 (keydown.enter)="selectNode(node.id)"
                 (keydown.space)="selectNode(node.id)"
                 [class.bg-boreal-panel-elevated]="selectedNodeId() === node.id">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full"
                    [class.bg-boreal-green]="node.status === 'ACTIVE'"
                    [class.bg-boreal-amber]="node.status === 'DEGRADED'"
                    [class.bg-boreal-red]="node.status === 'DISRUPTED'"
                    [class.bg-zinc-500]="node.status === 'OFFLINE'">
                  </span>
                  <span class="text-[10px] font-bold text-boreal-text-primary uppercase tracking-tight">{{ node.name }}</span>
                </div>
                <span class="text-[8px] font-mono px-1 py-0.5 rounded border"
                  [class.text-boreal-green]="node.status === 'ACTIVE'"
                  [class.border-boreal-green/30]="node.status === 'ACTIVE'"
                  [class.text-boreal-amber]="node.status === 'DEGRADED'"
                  [class.border-boreal-amber/30]="node.status === 'DEGRADED'"
                  [class.text-boreal-red]="node.status === 'DISRUPTED' || node.status === 'OFFLINE'"
                  [class.border-boreal-red/30]="node.status === 'DISRUPTED' || node.status === 'OFFLINE'">
                  {{ node.status }}
                </span>
              </div>

              <div class="space-y-1.5">
                <div class="flex items-center gap-2">
                  <span class="text-[8px] text-boreal-text-muted w-12 uppercase">FUEL</span>
                  <div class="flex-grow h-1 bg-boreal-panel-muted rounded-full overflow-hidden">
                    <div class="h-full bg-boreal-blue transition-all" [style.width.%]="node.fuelLevel * 100"></div>
                  </div>
                  <span class="text-[8px] font-mono text-boreal-text-secondary w-6 text-right">{{ (node.fuelLevel * 100 | number:'1.0-0') }}%</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[8px] text-boreal-text-muted w-12 uppercase">AMMO</span>
                  <div class="flex-grow h-1 bg-boreal-panel-muted rounded-full overflow-hidden">
                    <div class="h-full bg-boreal-amber transition-all" [style.width.%]="node.ammoLevel * 100"></div>
                  </div>
                  <span class="text-[8px] font-mono text-boreal-text-secondary w-6 text-right">{{ (node.ammoLevel * 100 | number:'1.0-0') }}%</span>
                </div>
              </div>

              <div class="flex items-center gap-4 mt-2 pt-2 border-t border-boreal-border/50">
                <span class="text-[8px] text-boreal-text-muted uppercase">Type: <span class="text-boreal-text-secondary font-bold">{{ node.type }}</span></span>
                <span class="text-[8px] text-boreal-text-muted uppercase">Base: <span class="text-boreal-text-secondary font-bold">{{ node.baseId }}</span></span>
              </div>
            </div>
          }
        </div>

        <!-- Refresh footer -->
        <div class="p-3 border-t border-boreal-border bg-boreal-panel-muted/20 flex items-center justify-between">
          <span class="text-[8px] text-boreal-text-muted font-mono uppercase">
            @if (logistics.lastRefreshed()) {
              Synced {{ logistics.lastRefreshed() | date:'HH:mm:ss' }}
            } @else {
              Seed data active
            }
          </span>
          <button (click)="logistics.refresh()"
            [disabled]="logistics.loading()"
            class="text-[8px] text-boreal-blue font-bold uppercase hover:brightness-110 disabled:opacity-40">
            {{ logistics.loading() ? 'Syncing...' : 'Refresh' }}
          </button>
        </div>
      </div>

      <!-- Center: Logistics Map -->
      <div class="logistics-map boreal-map-surface flex-grow bg-boreal-canvas relative overflow-hidden flex flex-col">
        <!-- Header strip -->
        <div class="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 bg-boreal-panel/70 backdrop-blur border-b border-boreal-border">
          <div class="flex items-center gap-3">
            <mat-icon class="text-boreal-blue !text-sm">local_shipping</mat-icon>
            <span class="text-[9px] font-black text-boreal-text-primary uppercase tracking-widest">Logistics & Reinforcement Map</span>
            <span class="text-[8px] font-mono text-boreal-text-muted">{{ logistics.openCorridors().length }} OPEN CORRIDORS</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-[8px] font-mono text-boreal-text-muted uppercase">{{ logistics.enRouteReinforcements().length }} RNF EN ROUTE</span>
          </div>
        </div>

        <!-- Dot-grid background -->
        <div class="absolute inset-0 opacity-5 pointer-events-none">
          <div class="absolute w-full h-full" style="background-image: radial-gradient(var(--boreal-blue) 1px, transparent 1px); background-size: 80px 80px;"></div>
        </div>

        <!-- SVG logistics map -->
        <div class="flex-grow mt-10 relative overflow-hidden">
          <svg class="w-full h-full" viewBox="0 0 1670 1300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Logistics and reinforcement map">
            <defs>
              <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="var(--boreal-blue)" opacity="0.7" />
              </marker>
              <marker id="arrowAmber" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="var(--boreal-amber)" opacity="0.7" />
              </marker>
            </defs>

            <!-- Terrain (dim background) -->
            @for (feature of mapFeatures; track feature.name) {
              @if (feature.recordType === 'terrain' && feature.coordinates) {
                <polygon [attr.points]="formatCoords(feature.coordinates)"
                  [class.fill-boreal-blue/3]="feature.side === 'north'"
                  [class.fill-boreal-red/3]="feature.side === 'south'"
                  [class.stroke-boreal-blue/8]="feature.side === 'north'"
                  [class.stroke-boreal-red/8]="feature.side === 'south'"
                  stroke-width="1" />
              }
            }

            <!-- Blue bases (dim reference) -->
            @for (feature of mapFeatures; track feature.name) {
              @if (feature.recordType === 'location' && feature.subtype === 'air_base' && feature.side === 'north' && feature.x !== undefined && feature.y !== undefined) {
                <circle [attr.cx]="feature.x" [attr.cy]="feature.y" r="8"
                  class="fill-boreal-blue/10 stroke-boreal-blue/30" stroke-width="1" />
                <text [attr.x]="feature.x" [attr.y]="feature.y + 20"
                  text-anchor="middle" class="text-[8px] fill-boreal-blue/50 font-mono uppercase" style="font-size: 8.5px;">
                  {{ feature.name.substring(0, 10) }}
                </text>
              }
            }

            <!-- Supply Corridors -->
            @for (corridor of logistics.corridors(); track corridor.id) {
              @if (corridor.waypoints.length >= 2) {
                <polyline
                  [attr.points]="formatWaypoints(corridor.waypoints)"
                  fill="none"
                  [attr.stroke]="getCorridorColor(corridor.status)"
                  stroke-width="1.5"
                  [attr.stroke-dasharray]="corridor.status === 'CONTESTED' ? '6,4' : (corridor.status === 'BLOCKED' ? '2,4' : 'none')"
                  opacity="0.6"
                  [attr.marker-end]="corridor.status !== 'BLOCKED' ? 'url(#arrowBlue)' : ''"
                />
                <!-- Corridor label at midpoint -->
                <text
                  [attr.x]="getMidX(corridor.waypoints)"
                  [attr.y]="getMidY(corridor.waypoints) - 6"
                  text-anchor="middle"
                  class="fill-boreal-text-muted"
                  style="font-size: 7.75px; font-family: monospace;"
                  opacity="0.6">
                  {{ corridor.name }} ({{ corridor.estimatedHours }}h)
                </text>
              }
            }

            <!-- Supply Nodes -->
            @for (node of logistics.supplyNodes(); track node.id) {
              <g [attr.transform]="'translate(' + node.x + ',' + node.y + ')'"
                 class="cursor-pointer"
                 (click)="selectNode(node.id)">
                <!-- Node hex symbol -->
                <polygon points="0,-9 8,-4 8,4 0,9 -8,4 -8,-4"
                  [attr.fill]="getNodeFill(node)"
                  [attr.stroke]="getNodeStroke(node)"
                  stroke-width="1.5"
                  [class.opacity-60]="node.status === 'OFFLINE'"
                />
                <!-- Type icon text -->
                <text y="3.5" text-anchor="middle" style="font-size: 6.5px; font-family: monospace; font-weight: bold;" class="fill-boreal-text-primary select-none pointer-events-none">
                  {{ nodeTypeCode(node.type) }}
                </text>
                <!-- Selection indicator -->
                @if (selectedNodeId() === node.id) {
                  <circle r="14" fill="none" class="stroke-boreal-blue" stroke-width="1" stroke-dasharray="3,2" />
                }
                <!-- Priority badge -->
                @if (node.priority === 'CRITICAL') {
                  <circle cx="8" cy="-8" r="3" class="fill-boreal-red" />
                }
                <!-- Label -->
                <text y="20" text-anchor="middle"
                  style="font-size: 7.75px; font-family: monospace; font-weight: bold;"
                  class="fill-boreal-text-secondary select-none pointer-events-none">
                  {{ node.id }}
                </text>
              </g>
            }

            <!-- Reinforcement Groups -->
            @for (rnf of logistics.reinforcements(); track rnf.id) {
              <g [attr.transform]="'translate(' + rnf.x + ',' + rnf.y + ')'">
                <!-- Diamond symbol for reinforcement convoy -->
                <rect x="-6" y="-6" width="12" height="12"
                  [attr.fill]="getRnfFill(rnf)"
                  [attr.stroke]="getRnfStroke(rnf)"
                  stroke-width="1.5"
                  transform="rotate(45)" />
                <!-- Pulse for EN_ROUTE -->
                @if (rnf.status === 'EN_ROUTE') {
                  <circle r="16" fill="none" class="stroke-boreal-amber/40 animate-ping" stroke-width="0.5" />
                }
                <text y="22" text-anchor="middle"
                  style="font-size: 7.75px; font-family: monospace;"
                  class="fill-boreal-text-muted select-none pointer-events-none">
                  {{ rnf.id }} ({{ rnf.eta }})
                </text>
              </g>
            }
          </svg>
        </div>
      </div>

      <!-- Right Panel: Corridors + Reinforcements + Recommendation -->
      <div class="logistics-panel logistics-panel--right w-80 border-l border-boreal-border bg-boreal-panel flex flex-col overflow-y-auto z-20 shadow-[-20px_0_40px_var(--boreal-shadow)]">

        <!-- Corridors section -->
        <div class="panel-header uppercase tracking-widest text-[10px] text-boreal-text-muted">Supply Corridors</div>
        <div class="p-4 flex flex-col gap-2 border-b border-boreal-border">
          @for (corridor of logistics.corridors(); track corridor.id) {
            <div class="flex items-center justify-between p-2 rounded border transition-all"
              [class.border-boreal-green/30]="corridor.status === 'OPEN'"
              [class.bg-boreal-green/5]="corridor.status === 'OPEN'"
              [class.border-boreal-amber/30]="corridor.status === 'CONTESTED'"
              [class.bg-boreal-amber/5]="corridor.status === 'CONTESTED'"
              [class.border-boreal-red/30]="corridor.status === 'BLOCKED'"
              [class.bg-boreal-red/5]="corridor.status === 'BLOCKED'">
              <div class="flex flex-col">
                <span class="text-[9px] font-bold text-boreal-text-primary uppercase tracking-tighter">{{ corridor.name }}</span>
                <span class="text-[8px] text-boreal-text-muted font-mono">{{ corridor.estimatedHours }}h · Exposure {{ (corridor.threatExposure * 100 | number:'1.0-0') }}%</span>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="text-[8px] font-bold uppercase"
                  [class.text-boreal-green]="corridor.status === 'OPEN'"
                  [class.text-boreal-amber]="corridor.status === 'CONTESTED'"
                  [class.text-boreal-red]="corridor.status === 'BLOCKED'">
                  {{ corridor.status }}
                </span>
                @if (corridor.status === 'CONTESTED') {
                  <button (click)="logistics.updateCorridorStatus(corridor.id, 'BLOCKED')"
                    class="text-[7px] text-boreal-red border border-boreal-red/30 px-1 py-0.5 rounded uppercase font-bold hover:bg-boreal-red/10 transition-colors">
                    Block
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <!-- Reinforcements section -->
        <div class="panel-header uppercase tracking-widest text-[10px] text-boreal-text-muted">Reinforcements</div>
        <div class="p-4 flex flex-col gap-2 border-b border-boreal-border">
          @for (rnf of logistics.reinforcements(); track rnf.id) {
            <div class="p-3 border border-boreal-border rounded-sm bg-boreal-canvas/40 flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-bold text-boreal-text-primary uppercase tracking-tighter">{{ rnf.name }}</span>
                <span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                  [class.bg-boreal-amber/10]="rnf.status === 'EN_ROUTE'"
                  [class.text-boreal-amber]="rnf.status === 'EN_ROUTE'"
                  [class.bg-boreal-blue/10]="rnf.status === 'STAGED'"
                  [class.text-boreal-blue]="rnf.status === 'STAGED'"
                  [class.bg-boreal-green/10]="rnf.status === 'ARRIVED'"
                  [class.text-boreal-green]="rnf.status === 'ARRIVED'"
                  [class.bg-zinc-500/10]="rnf.status === 'COMMITTED'"
                  [class.text-zinc-400]="rnf.status === 'COMMITTED'">
                  {{ rnf.status }}
                </span>
              </div>
              <div class="flex items-center gap-3 text-[8px] text-boreal-text-muted font-mono">
                <span>{{ rnf.type }}</span>
                <span>Qty: {{ rnf.quantity }}</span>
                <span>ETA: {{ rnf.eta }}</span>
              </div>
              <span class="text-[7px] text-boreal-text-muted uppercase tracking-widest">→ {{ rnf.destinationBaseId }}</span>
            </div>
          }
        </div>

        <!-- AI Logistics Recommendation -->
        <div class="p-4 flex flex-col gap-3">
          <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-widest">Logistics Advisory</span>

          @if (_advisoryText()) {
            <div class="p-3 bg-boreal-canvas/50 border border-boreal-blue/20 rounded-sm">
              <span class="text-[8px] text-boreal-blue font-bold uppercase tracking-widest block mb-2">Advisory</span>
              <p class="text-[10px] text-boreal-text-secondary leading-relaxed italic">{{ _advisoryText() }}</p>
            </div>
          }

          <button (click)="generateAdvisory()"
            [disabled]="_advisoryLoading()"
            class="w-full py-2.5 bg-boreal-blue/10 border border-boreal-blue/30 rounded-sm text-[10px] font-black text-boreal-blue hover:bg-boreal-blue/20 transition-all disabled:opacity-30 flex items-center justify-center gap-2">
            @if (_advisoryLoading()) {
              <mat-icon class="!text-xs animate-spin">refresh</mat-icon>
              Generating...
            } @else {
              <mat-icon class="!text-xs">auto_awesome</mat-icon>
              Generate Advisory
            }
          </button>

          @if (selectedNode()) {
            <div class="mt-2 p-3 bg-boreal-panel-muted/20 border border-boreal-border rounded-sm">
              <span class="text-[8px] font-black text-boreal-text-muted uppercase tracking-widest block mb-2">Selected: {{ selectedNode()!.name }}</span>
              <div class="grid grid-cols-2 gap-2 text-[8px]">
                <div>
                  <span class="text-boreal-text-muted uppercase">Throughput</span>
                  <div class="font-bold text-boreal-text-primary">{{ (selectedNode()!.throughput * 100 | number:'1.0-0') }}%/hr</div>
                </div>
                <div>
                  <span class="text-boreal-text-muted uppercase">Priority</span>
                  <div class="font-bold" [class.text-boreal-red]="selectedNode()!.priority === 'CRITICAL'" [class.text-boreal-amber]="selectedNode()!.priority === 'HIGH'" [class.text-boreal-text-primary]="selectedNode()!.priority === 'STANDARD'">
                    {{ selectedNode()!.priority }}
                  </div>
                </div>
              </div>
              <div class="flex gap-2 mt-3">
                <button (click)="logistics.updateNodeStatus(selectedNode()!.id, 'ACTIVE')"
                  class="flex-grow py-1.5 text-[8px] font-bold uppercase border border-boreal-green/30 text-boreal-green rounded-sm hover:bg-boreal-green/10 transition-colors">
                  Mark Active
                </button>
                <button (click)="logistics.updateNodeStatus(selectedNode()!.id, 'DISRUPTED')"
                  class="flex-grow py-1.5 text-[8px] font-bold uppercase border border-boreal-red/30 text-boreal-red rounded-sm hover:bg-boreal-red/10 transition-colors">
                  Disrupt
                </button>
              </div>
            </div>
          }

          <div class='mt-4 border-t border-boreal-border/30 pt-3'>
            <div class='text-[8px] font-mono uppercase tracking-widest text-boreal-text-muted mb-2'>Logistics Rationale</div>
            @if (logisticsRationaleLoading()) {
              <div class='animate-pulse h-2 bg-boreal-border/50 rounded w-3/4'></div>
            } @else {
              <p class='text-[9px] italic text-boreal-text-muted leading-relaxed border-l-2 border-boreal-border pl-3'>{{ logisticsRationale() }}</p>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .w-80 { width: 320px; }
    .logistics-panel { min-width: 0; }

    @media (max-width: 1200px) {
      .w-80 { width: 280px; }
    }

    @media (max-width: 960px) {
      :host { height: auto; }

      .logistics-shell {
        flex-direction: column;
        overflow-y: auto;
      }

      .logistics-panel--left,
      .logistics-panel--right {
        width: 100%;
        min-width: 0;
        max-height: 30rem;
      }

      .logistics-panel--left {
        order: 1;
        border-right: 0;
        border-bottom: 1px solid var(--boreal-border);
      }

      .logistics-map {
        order: 2;
        min-height: 58vh;
      }

      .logistics-panel--right {
        order: 3;
        border-left: 0;
        border-top: 1px solid var(--boreal-border);
        box-shadow: 0 -20px 40px var(--boreal-shadow);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogisticsConsole implements OnInit {
  logistics  = inject(LogisticsStore);
  readiness  = inject(ReadinessStore);
  policy     = inject(PolicyStore);
  layers     = inject(MapLayerStore);
  llm        = inject(LLMService);
  audit      = inject(AuditLogger);
  private http = inject(HttpClient);

  mapFeatures = ENGAGEMENT_MAP_FEATURES;

  selectedNodeId  = signal<string | null>(null);
  _advisoryText   = signal<string | null>(null);
  _advisoryLoading = signal(false);

  logisticsRationale = signal('');
  logisticsRationaleLoading = signal(false);

  ngOnInit() {
    this.logisticsRationaleLoading.set(true);
    this.http.post<{rationaleText: string}>('/api/rationale/logistics', {
      context: 'Current logistics posture assessment'
    }).subscribe({
      next: r => { this.logisticsRationale.set(r.rationaleText); this.logisticsRationaleLoading.set(false); },
      error: () => this.logisticsRationaleLoading.set(false)
    });
  }

  selectedNode = computed(() =>
    this.logistics.supplyNodes().find(n => n.id === this.selectedNodeId()) ?? null
  );

  selectNode(id: string) {
    this.selectedNodeId.set(id === this.selectedNodeId() ? null : id);
  }

  generateAdvisory() {
    this._advisoryLoading.set(true);
    this._advisoryText.set(null);
    const snapshot = {
      supplyHealth: this.logistics.supplyHealth(),
      openCorridors: this.logistics.openCorridors().length,
      enRoute: this.logistics.enRouteReinforcements().length,
      degradedNodes: this.logistics.supplyNodes().filter(n => n.status === 'DEGRADED' || n.status === 'DISRUPTED').map(n => n.name),
    };
    this.llm.getRationaleForLogistics(snapshot).subscribe({
      next: res => {
        this._advisoryText.set(res.rationaleText);
        this._advisoryLoading.set(false);
        this.audit.log({
          actor: 'SYSTEM',
          action: 'Logistics Advisory Generated',
          rationale: `Advisory generated. Source: ${res.source}. Supply health: ${(snapshot.supplyHealth * 100).toFixed(0)}%.`,
          category: 'READINESS',
        });
      },
      error: () => this._advisoryLoading.set(false),
    });
  }

  formatCoords(coords: [number, number][]): string {
    return coords.map(c => `${c[0]},${c[1]}`).join(' ');
  }

  formatWaypoints(pts: { x: number; y: number }[]): string {
    return pts.map(p => `${p.x},${p.y}`).join(' ');
  }

  getMidX(pts: { x: number; y: number }[]): number {
    return pts[Math.floor(pts.length / 2)].x;
  }

  getMidY(pts: { x: number; y: number }[]): number {
    return pts[Math.floor(pts.length / 2)].y;
  }

  getCorridorColor(status: SupplyCorridor['status']): string {
    switch (status) {
      case 'OPEN':      return 'var(--boreal-blue)';
      case 'CONTESTED': return 'var(--boreal-amber)';
      case 'BLOCKED':   return 'var(--boreal-red)';
    }
  }

  getNodeFill(node: SupplyNode): string {
    if (node.status === 'OFFLINE') return 'transparent';
    if (node.status === 'DISRUPTED') return 'rgba(239,68,68,0.1)';
    if (node.status === 'DEGRADED')  return 'rgba(245,158,11,0.1)';
    return 'rgba(59,130,246,0.1)';
  }

  getNodeStroke(node: SupplyNode): string {
    if (node.status === 'DISRUPTED') return 'var(--boreal-red)';
    if (node.status === 'DEGRADED')  return 'var(--boreal-amber)';
    if (node.status === 'OFFLINE')   return 'var(--boreal-text-muted)';
    return 'var(--boreal-blue)';
  }

  nodeTypeCode(type: SupplyNode['type']): string {
    switch (type) {
      case 'FUEL':        return 'F';
      case 'AMMO':        return 'A';
      case 'MAINTENANCE': return 'M';
      case 'COMBINED':    return 'C';
    }
  }

  getRnfFill(rnf: ReinforcementGroup): string {
    switch (rnf.status) {
      case 'EN_ROUTE': return 'rgba(245,158,11,0.15)';
      case 'STAGED':   return 'rgba(59,130,246,0.10)';
      case 'ARRIVED':  return 'rgba(34,197,94,0.15)';
      default:         return 'rgba(113,113,122,0.1)';
    }
  }

  getRnfStroke(rnf: ReinforcementGroup): string {
    switch (rnf.status) {
      case 'EN_ROUTE': return 'var(--boreal-amber)';
      case 'STAGED':   return 'var(--boreal-blue)';
      case 'ARRIVED':  return 'var(--boreal-green)';
      default:         return 'var(--boreal-text-muted)';
    }
  }
}
