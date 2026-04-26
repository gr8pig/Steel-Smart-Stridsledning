import { Component, ChangeDetectionStrategy, inject, signal, computed, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TacticalStore } from '../../core/state/tactical.store';
import { PolicyStore } from '../../core/state/policy.store';
import { ReadinessStore } from '../../core/state/readiness.store';
import { ScenarioStore } from '../../core/state/scenario.store';
import { OrchestrationStore } from '../../core/state/orchestration.store';
import { MapLayerStore } from '../../core/state/map-layer.store';
import { LogisticsStore } from '../../core/state/logistics.store';
import { CapabilityOrchestrator } from '../../core/services/capability-orchestrator';
import { AuditLogger, AuditEvent } from '../../core/services/audit-logger';
import { SteelApiService } from '../../core/services/steel-api.service';
import { SensorFeedStore } from '../../core/state/sensor-feed.store';
import { DecisionFabricStore } from '../../core/state/decision-fabric.store';
import { OperationalDirectiveQueueService } from '../../core/services/operational-directive-queue.service';
import { ThreatTwin, MapFeature } from '../../shared/domain/models';
import { SupplyNode, SupplyCorridor } from '../../shared/domain/logistics-ontology';

import { ENGAGEMENT_MAP_FEATURES } from '../../shared/domain/engagement-map.data';
import { CapabilityLayerStore } from '../../core/state/capability-layer.store';
import { WindowFrameComponent } from '../../shared/ui/window-frame/window-frame.component';
import { SafetyBanner } from '../../shared/ui/safety-banner';
import { TacticalThreatQueueComponent } from './components/tactical-threat-queue.component';
import { TacticalRecommendationsComponent } from './components/tactical-recommendations.component';

interface DegradedHeatCell {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zone: 'NO-CONFIDENCE' | 'CAUTION' | 'INVESTIGATE';
  opacity: number;
  score: number;
  queued: boolean;
}

@Component({
  selector: 'app-tactical-console',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    SafetyBanner, 
    WindowFrameComponent,
    TacticalThreatQueueComponent,
    TacticalRecommendationsComponent
  ],
  template: `
    <div class="tactical-shell h-full w-full flex overflow-hidden relative">
      <app-safety-banner />

      <!-- Deployment Status Overlay -->
      @if (orchestration.publishedIntent(); as intent) {
          <div class="tactical-intent-toast absolute top-18 left-90 z-50 px-4 py-2 bg-boreal-blue/20 backdrop-blur-xl border border-boreal-blue/40 rounded shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <mat-icon class="text-boreal-blue animate-pulse">published_with_changes</mat-icon>
              <div class="flex flex-col">
                  <span class="text-[9px] font-mono text-boreal-text-muted uppercase tracking-widest">New Intent Published</span>
                  <span class="text-[10px] font-bold text-boreal-text-primary uppercase">{{ intent.commanderRationale }}</span>
              </div>
              <button (click)="orchestration.clearIntent()" class="ml-4 text-boreal-text-muted hover:text-boreal-text-primary">
                  <mat-icon class="!text-sm">close</mat-icon>
              </button>
          </div>
      }
      
      <!-- Left Threat Queue -->
      <app-window-frame title="Threat Queue" class="absolute top-4 left-4 z-20">
        <app-tactical-threat-queue (trackSelected)="selectTrack($event)" />
      </app-window-frame>

      <!-- Center Map Area -->
      <div class="tactical-map flex-grow bg-boreal-canvas relative overflow-hidden flex flex-col">
         <!-- Radial Grid -->
         <div class="absolute inset-0 opacity-5 pointer-events-none">
            <div class="absolute w-full h-full" [style.background-image]="'radial-gradient(var(--boreal-blue) 1px, transparent 1px)'" style="background-size: 80px 80px;"></div>
         </div>

         <!-- Map Controls Overlay -->
         <div class="absolute top-4 left-4 z-40 flex flex-col gap-2">
            <!-- Layers / Legend Toggle -->
            <div class="flex flex-col bg-boreal-panel/90 backdrop-blur-md border border-boreal-border rounded shadow-2xl overflow-hidden min-w-48">
                <div class="px-3 py-1.5 bg-boreal-panel-elevated/50 border-b border-boreal-border flex items-center justify-between">
                    <span class="text-[9px] font-black text-boreal-text-muted uppercase tracking-widest">Map Layers</span>
                    <mat-icon class="!w-3 !h-3 !text-[10px] text-boreal-blue">layers</mat-icon>
                </div>
                <div class="flex flex-col p-1 gap-0.5">
                    @for (layer of layers.allLayers(); track layer.id) {
                        <button
                            (click)="layers.toggleLayer(layer.id)"
                            class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors group"
                            [class.opacity-40]="!layer.visible"
                        >
                            <mat-icon class="!w-3.5 !h-3.5 !text-[12px]" [class.text-boreal-blue]="layer.visible">{{ layer.visible ? 'check_box' : 'check_box_outline_blank' }}</mat-icon>
                            <span class="text-[9px] font-bold uppercase tracking-tight text-left flex-grow" [class.text-boreal-text-primary]="layer.visible" [class.text-boreal-text-muted]="!layer.visible">{{ layer.label }}</span>
                            <mat-icon class="!w-3 !h-3 !text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">{{ layer.icon }}</mat-icon>
                        </button>
                    }
                </div>
                <!-- IFZ Display Mode toggle — only shown when IFZ layer is on -->
                @if (layers.isLayerVisible('ifz_polygons')) {
                    <div class="px-2 py-1.5 bg-boreal-panel-elevated/30 border-t border-boreal-border flex items-center gap-2">
                        <span class="text-[7px] font-black text-boreal-text-muted uppercase tracking-widest flex-grow">IFZ Mode</span>
                        @for (mode of ifzModes; track mode.value) {
                            <button
                                (click)="layers.setIFZMode(mode.value)"
                                class="px-1.5 py-0.5 rounded-[1px] text-[7px] font-bold border transition-all uppercase tracking-tighter"
                                [class.bg-boreal-blue]="layers.ifzMode() === mode.value"
                                [class.text-white]="layers.ifzMode() === mode.value"
                                [class.border-boreal-blue]="layers.ifzMode() === mode.value"
                                [class.text-boreal-text-muted]="layers.ifzMode() !== mode.value"
                                [class.border-boreal-border]="layers.ifzMode() !== mode.value"
                                [class.bg-transparent]="layers.ifzMode() !== mode.value"
                            >{{ mode.label }}</button>
                        }
                    </div>
                }
            </div>
         </div>

         <!-- View Controls -->
         <div class="absolute top-4 right-4 z-40 flex flex-col gap-2">
            <div class="flex flex-col bg-boreal-panel/90 backdrop-blur-md border border-boreal-border rounded shadow-2xl overflow-hidden">
                <button (click)="zoomIn()" class="p-2.5 hover:bg-white/5 text-boreal-text-secondary hover:text-boreal-text-primary transition-colors" title="Zoom In">
                    <mat-icon class="!w-4 !h-4 !text-base">add</mat-icon>
                </button>
                <div class="h-[1px] bg-boreal-border"></div>
                <button (click)="zoomOut()" class="p-2.5 hover:bg-white/5 text-boreal-text-secondary hover:text-boreal-text-primary transition-colors" title="Zoom Out">
                    <mat-icon class="!w-4 !h-4 !text-base">remove</mat-icon>
                </button>
                <div class="h-[1px] bg-boreal-border"></div>
                <button (click)="resetView()" class="p-2.5 hover:bg-white/5 text-boreal-text-secondary hover:text-boreal-text-primary transition-colors" title="Reset Map">
                    <mat-icon class="!w-4 !h-4 !text-base">restart_alt</mat-icon>
                </button>
            </div>
         </div>

         @if (degradedMapMode()) {
            <div class="absolute left-4 top-32 z-40 max-w-sm rounded border border-boreal-amber/40 bg-boreal-panel/92 px-4 py-3 shadow-2xl backdrop-blur-md">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <div class="text-[9px] font-black uppercase tracking-[0.22em] text-boreal-amber">Degraded Tactical View</div>
                        <div class="mt-1 text-[10px] leading-relaxed text-boreal-text-secondary">
                            Precise tracks are suppressed offline. Heat cells show actionability from cached terrain, last-known adversary vectors, and queued directives.
                        </div>
                    </div>
                    <mat-icon class="!w-4 !h-4 !text-sm text-boreal-amber">wifi_off</mat-icon>
                </div>
                <div class="mt-3 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest">
                    <span class="rounded border border-boreal-blue/30 bg-boreal-blue/10 px-2 py-1 text-boreal-blue">TACTICAL {{ tactical.sync().source }}</span>
                    <span class="rounded border border-boreal-amber/30 bg-boreal-amber/10 px-2 py-1 text-boreal-amber">DECISION {{ decisionFabric.sync().source }}</span>
                    <span class="rounded border border-boreal-border bg-boreal-canvas/60 px-2 py-1 text-boreal-text-muted">LAST SYNC {{ lastSyncLabel() }}</span>
                    <span class="rounded border border-boreal-red/30 bg-boreal-red/10 px-2 py-1 text-boreal-red">QUEUE {{ directiveQueue.pendingCount() }}</span>
                </div>
            </div>
         }

         <!-- Status Strip -->
         <div class="tactical-status-strip absolute bottom-28 left-4 right-4 z-40 h-8 flex items-center justify-between gap-4 pointer-events-none">
            <div class="flex items-center gap-2 bg-boreal-panel/90 backdrop-blur-md border border-boreal-border rounded px-3 py-1 shadow-xl pointer-events-auto">
               <div class="flex items-center gap-1.5 border-r border-boreal-border pr-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-boreal-blue animate-pulse"></span>
                  <span class="text-[9px] font-mono text-boreal-text-primary font-bold">OP_MAP_V1</span>
               </div>
               <div class="flex items-center gap-2">
                  <span class="text-[8px] font-mono text-boreal-text-muted uppercase">Zoom: {{zoomLevel().toFixed(2)}}x</span>
                  <span class="text-[8px] font-mono text-boreal-text-muted uppercase">Tracks: {{tactical.activeThreats().length}}</span>
                  <span class="text-[8px] font-mono text-boreal-text-muted uppercase">Src: {{tactical.sync().source}}</span>
                  <span class="text-[8px] font-mono text-boreal-text-muted uppercase">Queue: {{directiveQueue.pendingCount()}}</span>
               </div>
            </div>
            
            @if (!degradedMapMode() && tactical.selectedTrack(); as track) {
                <div class="flex items-center gap-3 bg-boreal-red/10 backdrop-blur-md border border-boreal-red/30 rounded px-4 py-1 shadow-xl animate-in slide-in-from-bottom-2 duration-300 pointer-events-auto">
                   <mat-icon class="text-boreal-red !w-4 !h-4 !text-[14px]">priority_high</mat-icon>
                   <div class="flex flex-col">
                      <span class="text-[8px] font-black text-boreal-red uppercase tracking-widest leading-tight">Intercept Priority</span>
                      <span class="text-[10px] font-mono text-boreal-text-primary font-bold leading-tight">{{ track.id }} ({{ track.class }}) - T: {{ track.timeToTarget }}s</span>
                   </div>
                </div>
            } @else if (degradedMapMode()) {
                <div class="flex items-center gap-3 bg-boreal-amber/10 backdrop-blur-md border border-boreal-amber/30 rounded px-4 py-1 shadow-xl pointer-events-auto">
                   <mat-icon class="text-boreal-amber !w-4 !h-4 !text-[14px]">blur_on</mat-icon>
                   <div class="flex flex-col">
                      <span class="text-[8px] font-black text-boreal-amber uppercase tracking-widest leading-tight">Offline Actionability Surface</span>
                      <span class="text-[10px] font-mono text-boreal-text-primary font-bold leading-tight">Investigate and caution zones replace precise tracks until link restoration.</span>
                   </div>
                </div>
            }
         </div>

         <!-- Tactical Map SVG View -->
         <div 
            #mapContainer
            class="flex-grow relative overflow-hidden cursor-move active:cursor-grabbing select-none"
            (wheel)="onWheel($event)"
            (mousedown)="onMouseDown($event)"
        >
            <svg 
                class="w-full h-full" 
                viewBox="0 0 1670 1300" 
                preserveAspectRatio="xMidYMid slice"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <filter id="shadow">
                        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.5"/>
                    </filter>
                    <filter id="glow-blue">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                <g [attr.transform]="mapTransform()">
                    <!-- Grid Lines -->
                    <g class="opacity-10 pointer-events-none">
                         @for (x of [0, 400, 800, 1200, 1600]; track x) {
                            <line [attr.x1]="x" y1="0" [attr.x2]="x" y2="1300" class="stroke-boreal-text-primary" stroke-width="0.5" />
                         }
                         @for (y of [0, 400, 800, 1200]; track y) {
                            <line x1="0" [attr.y1]="y" x2="1670" [attr.y2]="y" class="stroke-boreal-text-primary" stroke-width="0.5" />
                         }
                    </g>

                    <!-- Sensor Rings Layer: coverage halos around blue bases -->
                    @if (layers.isLayerVisible('sensor_rings')) {
                        <g class="pointer-events-none">
                            @for (feature of mapFeatures; track feature.name) {
                                @if (feature.recordType === 'location' && feature.subtype === 'air_base' && feature.x !== undefined && feature.y !== undefined) {
                                    <circle [attr.cx]="feature.x" [attr.cy]="feature.y" r="200"
                                        fill="none" class="stroke-boreal-blue/15" stroke-width="0.6" stroke-dasharray="6,5"/>
                                    <circle [attr.cx]="feature.x" [attr.cy]="feature.y" r="110"
                                        fill="none" class="stroke-boreal-blue/10" stroke-width="0.4" stroke-dasharray="2,7"/>
                                }
                            }
                        </g>
                    }

                    <!-- Terrain Layer -->
                    @if (layers.isLayerVisible('terrain')) {
                        @for (feature of mapFeatures; track feature.name) {
                            @if (feature.recordType === 'terrain' && feature.coordinates) {
                                <polygon 
                                    [attr.points]="formatCoordinates(feature.coordinates)"
                                    class="transition-all duration-700"
                                    [class.fill-boreal-blue/5]="feature.side === 'north'"
                                    [class.fill-boreal-red/5]="feature.side === 'south'"
                                    [class.stroke-boreal-blue/10]="feature.side === 'north'"
                                    [class.stroke-boreal-red/10]="feature.side === 'south'"
                                    stroke-width="1.5"
                                />
                            }
                        }
                    }

                    <!-- Engagement Geometry Layer -->
                    @if (layers.isLayerVisible('engagement_vectors') && !degradedMapMode()) {
                        <g class="pointer-events-none">
                            @for (track of tactical.tracks(); track track.id) {
                                @if (getEngagementPath(track); as path) {
                                    <!-- Intercept Path -->
                                    <line 
                                        [attr.x1]="track.geometry.x" 
                                        [attr.y1]="track.geometry.y"
                                        [attr.x2]="path.targetX"
                                        [attr.y2]="path.targetY"
                                        class="stroke-boreal-blue/40"
                                        stroke-width="1"
                                        stroke-dasharray="4,4"
                                    />
                                    <!-- Intercept Point -->
                                    <circle 
                                        [attr.cx]="path.targetX" 
                                        [attr.cy]="path.targetY" 
                                        r="3" 
                                        class="fill-boreal-blue/60"
                                    />
                                }
                            }
                        </g>
                    }

                    <!-- Spatial Density (Convex Hull) Layer -->
                    @if (layers.isLayerVisible('intent_halos') && tactical.activeThreats().length > 2 && !degradedMapMode()) {
                        <polygon 
                            [attr.points]="clusterHullPointsString()" 
                            fill="rgba(239, 68, 68, 0.05)" 
                            stroke="rgba(239, 68, 68, 0.3)" 
                            stroke-width="2" 
                            stroke-dasharray="4 4"
                            class="pointer-events-none"
                        />
                    }

                    <!-- IFZ Polygons Layer: instantaneous fire zone around each threat -->
                    @if (layers.isLayerVisible('ifz_polygons') && !degradedMapMode()) {
                        <g class="pointer-events-none">
                            @for (track of ifzTracks(); track track.id) {
                                <circle
                                    [attr.cx]="track.geometry.x"
                                    [attr.cy]="track.geometry.y"
                                    [attr.r]="getIFZRadius(track)"
                                    fill="none"
                                    [attr.stroke]="getIntentColor(track.intent)"
                                    stroke-width="0.8"
                                    stroke-dasharray="4,3"
                                    opacity="0.45"
                                    class="transition-all duration-700"
                                />
                                <circle
                                    [attr.cx]="track.geometry.x"
                                    [attr.cy]="track.geometry.y"
                                    [attr.r]="getIFZRadius(track)"
                                    [attr.fill]="getIntentColor(track.intent)"
                                    fill-opacity="0.04"
                                />
                            }
                        </g>
                    }

                    <!-- Supply Corridors Layer -->
                    @if (layers.isLayerVisible('corridors')) {
                        <g class="pointer-events-none">
                            @for (corridor of logistics.corridors(); track corridor.id) {
                                <polyline
                                    [attr.points]="corridorPoints(corridor)"
                                    fill="none"
                                    [attr.stroke]="corridorColor(corridor)"
                                    stroke-width="2"
                                    stroke-dasharray="8,5"
                                    opacity="0.55"
                                    class="transition-all duration-500"
                                />
                            }
                        </g>
                    }

                    <!-- Supply Nodes Layer -->
                    @if (layers.isLayerVisible('supply_nodes')) {
                        <g>
                            @for (node of logistics.supplyNodes(); track node.id) {
                                <g [attr.transform]="'translate(' + node.x + ',' + node.y + ')'">
                                    <!-- Hex outline -->
                                    <path
                                        [attr.d]="hexPath(10)"
                                        fill="none"
                                        [attr.stroke]="getSupplyNodeColor(node)"
                                        stroke-width="1.5"
                                        opacity="0.8"
                                    />
                                    <!-- Fuel/ammo fill bar (inner hex) -->
                                    <path
                                        [attr.d]="hexPath(node.fuelLevel * 7)"
                                        [attr.fill]="getSupplyNodeColor(node)"
                                        fill-opacity="0.25"
                                    />
                                    <!-- Priority indicator for critical nodes -->
                                    @if (node.priority === 'CRITICAL') {
                                        <circle r="13" fill="none"
                                            [attr.stroke]="getSupplyNodeColor(node)"
                                            stroke-width="0.5"
                                            stroke-dasharray="2,3"
                                            opacity="0.4"
                                        />
                                    }
                                    <!-- Label -->
                                    @if (zoomLevel() > 1.2) {
                                        <text y="22" text-anchor="middle"
                                            class="text-[7px] font-mono select-none pointer-events-none"
                                            [attr.fill]="getSupplyNodeColor(node)"
                                            [attr.style]="'transform: scale(' + 1/zoomLevel() + '); transform-origin: 0px 22px;'"
                                        >{{ node.id }}</text>
                                    }
                                </g>
                            }
                        </g>
                    }

                    <!-- Reinforcements Layer -->
                    @if (layers.isLayerVisible('reinforcements')) {
                        <g>
                            @for (rnf of logistics.reinforcements(); track rnf.id) {
                                @if (rnf.status === 'EN_ROUTE') {
                                    <g [attr.transform]="'translate(' + rnf.x + ',' + rnf.y + ')'">
                                        <!-- Diamond -->
                                        <path d="M0,-8 L6,0 L0,8 L-6,0 Z"
                                            fill="none"
                                            class="stroke-boreal-blue"
                                            stroke-width="1.5"
                                            opacity="0.75"
                                        />
                                        <path d="M0,-5 L4,0 L0,5 L-4,0 Z"
                                            class="fill-boreal-blue"
                                            fill-opacity="0.2"
                                        />
                                        @if (zoomLevel() > 1.2) {
                                            <text y="18" text-anchor="middle"
                                                class="text-[7px] font-mono fill-boreal-blue select-none pointer-events-none"
                                                [attr.style]="'transform: scale(' + 1/zoomLevel() + '); transform-origin: 0px 18px;'"
                                            >{{ rnf.id }}</text>
                                        }
                                    </g>
                                }
                            }
                        </g>
                    }

                    <!-- Static Locations (Bases/Assets) -->
                    @for (feature of mapFeatures; track feature.name) {
                        @if (feature.recordType === 'location' && feature.x !== undefined && feature.y !== undefined) {
                            <g [attr.transform]="'translate(' + feature.x + ',' + feature.y + ')'">
                                
                                <!-- Defended Asset Indicator -->
                                @if (layers.isLayerVisible('defended_assets') && feature.notes?.includes('Priority')) {
                                   <g class="pointer-events-none">
                                       <!-- High visibility halo -->
                                       <circle r="18" fill="none" class="stroke-boreal-amber/20" stroke-width="4"></circle>
                                       <circle r="22" fill="none" class="stroke-boreal-amber/40" stroke-width="0.5" stroke-dasharray="2,4" class="animate-[spin_10s_linear_infinite]"></circle>
                                       
                                       <!-- Asset Label -->
                                       <g [attr.style]="'transform: scale(' + 1/zoomLevel() + '); transform-origin: 0 0;'">
                                           <rect x="-35" y="-36" width="70" height="12" rx="1" class="fill-boreal-amber/20 stroke-boreal-amber/40" stroke-width="0.5"></rect>
                                           <text y="-28" text-anchor="middle" class="text-[7px] fill-boreal-amber font-black uppercase tracking-widest select-none">CRIT_ASSET</text>
                                       </g>
                                   </g>
                                }

                                <!-- Base Symbology -->
                                @if (layers.isLayerVisible('bases') && feature.subtype === 'air_base') {
                                    <g class="cursor-pointer">
                                        <!-- Operational Status Halo -->
                                        @if (getBaseReadiness(feature.name); as read) {
                                            <circle r="12" fill="none" class="stroke-boreal-blue/20" stroke-width="2"></circle>
                                            <circle r="12" fill="none" class="stroke-boreal-blue" stroke-width="2" [attr.stroke-dasharray]="(read * 75.4) + ', 75.4'" transform="rotate(-90)"></circle>
                                        }

                                        <!-- Diamond Symbol (Boreal Standard for Base) -->
                                        <g transform="rotate(45)">
                                            <rect x="-4" y="-4" width="8" height="8" class="fill-boreal-canvas stroke-boreal-blue" stroke-width="1.5"></rect>
                                            <line x1="-2" y1="0" x2="2" y2="0" class="stroke-boreal-blue" stroke-width="0.5"></line>
                                            <line x1="0" y1="-2" x2="0" y2="2" class="stroke-boreal-blue" stroke-width="0.5"></line>
                                        </g>
                                    </g>
                                }

                                <!-- Civil Centers -->
                                @if (feature.subtype === 'capital') {
                                    <circle r="5" class="fill-none stroke-boreal-text-muted" stroke-width="1.5"></circle>
                                    <circle r="2" class="fill-boreal-text-muted"></circle>
                                }
                                @if (feature.subtype === 'major_city') {
                                    <circle r="2.5" class="fill-boreal-text-muted/40 stroke-boreal-text-muted/60" stroke-width="0.5"></circle>
                                }

                                <!-- Labels Layer -->
                                @if (layers.isLayerVisible('labels')) {
                                    @if (shouldShowLabel(feature, zoomLevel())) {
                                        <text 
                                            y="18" 
                                            text-anchor="middle" 
                                            class="text-[9px] font-mono fill-boreal-text-secondary select-none pointer-events-none font-bold uppercase tracking-tighter"
                                            [attr.style]="'transform: scale(' + 1/zoomLevel() + '); transform-origin: 0px 18px; text-shadow: 0 1px 4px black;'"
                                        >
                                            {{feature.name}}
                                        </text>
                                    }
                                }
                            </g>
                        }
                    }

                    @if (degradedMapMode()) {
                        <g class="pointer-events-none">
                            @for (cell of degradedHeatCells(); track cell.id) {
                                <rect
                                    [attr.x]="cell.x"
                                    [attr.y]="cell.y"
                                    [attr.width]="cell.width"
                                    [attr.height]="cell.height"
                                    [attr.fill]="degradedCellColor(cell.zone)"
                                    [attr.fill-opacity]="cell.opacity"
                                    [attr.stroke]="cell.queued ? 'var(--boreal-blue)' : degradedCellColor(cell.zone)"
                                    [attr.stroke-opacity]="cell.queued ? 0.32 : 0.12"
                                    stroke-width="1.1"
                                />
                            }
                        </g>
                    }

                    <!-- Threat Track Layer -->
                    @if (layers.isLayerVisible('threat_tracks') && !degradedMapMode()) {
                        @for (track of capabilityStore.remappedTracks(); track track.id) {
                            <g 
                                [attr.transform]="getTrackTransform(track)" 
                                class="transition-transform duration-500 ease-linear cursor-pointer group/track"
                                (click)="selectTrack(track.id); $event.stopPropagation()"
                            >
                                <!-- Uncertainty Radii (Degraded Confidence) -->
                                @if (track.confidence < 0.7) {
                                    <circle r="25" fill="none" class="stroke-boreal-red/5" stroke-width="10"></circle>
                                    <circle r="30" fill="none" class="stroke-boreal-red/10" stroke-width="1" stroke-dasharray="2,4" class="animate-pulse"></circle>
                                }

                                <!-- Intent Halo: colored ring showing dominant intent class -->
                                @if (layers.isLayerVisible('intent_halos')) {
                                    <circle r="14" fill="none"
                                        [attr.stroke]="getIntentColor(track.intent)"
                                        stroke-width="1.5"
                                        stroke-dasharray="3,2"
                                        opacity="0.65"
                                    />
                                }

                                <!-- Heading Vector -->
                                <line x1="0" y1="0" [attr.x2]="40" y2="0" [attr.transform]="'rotate(' + track.geometry.heading + ')'" class="stroke-boreal-red/40" stroke-width="1" stroke-dasharray="4,2"></line>

                                <!-- Threat Combat Symbol (Chevron Based) -->
                                <g [attr.transform]="'rotate(' + track.geometry.heading + ')'">
                                    <path 
                                        d="M-6,-4 L4,0 L-6,4" 
                                        fill="none" 
                                        [attr.stroke]="track.id === tactical.selectedTrackId() ? 'var(--boreal-blue)' : 'var(--boreal-red)'" 
                                        stroke-width="2" 
                                        stroke-linecap="square"
                                    ></path>
                                    @if (track.class === 'MISSILE') {
                                        <line x1="-10" y1="0" x2="-4" y2="0" class="stroke-boreal-red" stroke-width="1"></line>
                                    }
                                </g>

                                @if (track.id === tactical.selectedTrackId()) {
                                     <!-- Selection Brackets -->
                                     <path d="M-15,-15 L-10,-15 M-15,-15 L-15,-10" class="stroke-boreal-blue" stroke-width="1.5"></path>
                                     <path d="M15,-15 L10,-15 M15,-15 L15,-10" class="stroke-boreal-blue" stroke-width="1.5"></path>
                                     <path d="M-15,15 L-10,15 M-15,15 L-15,10" class="stroke-boreal-blue" stroke-width="1.5"></path>
                                     <path d="M15,15 L10,15 M15,15 L15,10" class="stroke-boreal-blue" stroke-width="1.5"></path>
                                     
                                     <!-- Call-out Label -->
                                     <g [attr.style]="'transform: scale(' + 1/zoomLevel() + '); transform-origin: 0 0;'">
                                         <g transform="translate(18, -18)">
                                            <rect x="0" y="-12" width="60" height="12" class="fill-boreal-blue/20 stroke-boreal-blue/40" stroke-width="0.5"></rect>
                                            <text x="4" y="-3" class="text-[8px] font-mono fill-boreal-blue font-black uppercase tracking-widest">
                                                {{ track.publicInterpretation ? track.publicInterpretation.displayName : 'TRK_' + track.id }}
                                            </text>
                                            @if (layers.isLayerVisible('source_badges') && track.publicInterpretation) {
                                                <text x="65" y="-3" class="text-[6px] font-mono fill-boreal-amber font-black uppercase tracking-tight">[SAAB-SOURCE]</text>
                                            }
                                         </g>
                                     </g>
                                }

                                <!-- ID Label (Always on for consistency if zoomed enough) -->
                                @if (zoomLevel() > 1.5 || track.id === tactical.selectedTrackId()) {
                                    <text 
                                        x="12" y="14" 
                                        class="text-[7px] font-mono fill-black font-bold select-none pointer-events-none"
                                        style="paint-order: stroke; stroke: var(--boreal-red); stroke-width: 2px;"
                                        [attr.style]="'transform: scale(' + 1/zoomLevel() + '); transform-origin: 12px 14px;'"
                                    >
                                        {{ track.publicInterpretation ? track.publicInterpretation.displayName : track.id }}
                                    </text>
                                    @if (layers.isLayerVisible('source_badges') && track.publicInterpretation) {
                                        <text 
                                            x="12" y="22" 
                                            class="text-[6px] font-mono fill-boreal-amber font-black select-none pointer-events-none uppercase tracking-tighter"
                                            [attr.style]="'transform: scale(' + 1/zoomLevel() + '); transform-origin: 12px 22px;'"
                                        >[SAAB-SOURCE]</text>
                                    }
                                }
                            </g>
                        }
                    }
                </g>
            </svg>
         </div>

         <!-- Timeline Pop-out Overlay -->
         @if (timelineExpanded()) {
           <div class="absolute bottom-24 left-0 right-0 z-30 flex flex-col bg-boreal-panel border-t border-boreal-border shadow-[0_-20px_60px_var(--boreal-shadow)]" style="height:300px">
             <!-- Pop-out Header -->
             <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted py-1 px-3 flex justify-between items-center shrink-0">
               <div class="flex items-center gap-3">
                 <span class="text-boreal-blue font-black tracking-[0.2em]">Engagement Timeline</span>
                 <button (click)="togglePlayback()"
                   class="flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[7px] font-black uppercase tracking-widest transition-all"
                   [class.bg-boreal-green/10]="scenario.runState() !== 'RUNNING'"
                   [class.border-boreal-green/30]="scenario.runState() !== 'RUNNING'"
                   [class.text-boreal-green]="scenario.runState() !== 'RUNNING'"
                   [class.bg-boreal-amber/10]="scenario.runState() === 'RUNNING'"
                   [class.border-boreal-amber/30]="scenario.runState() === 'RUNNING'"
                   [class.text-boreal-amber]="scenario.runState() === 'RUNNING'"
                 >
                   <mat-icon class="!text-[10px] !w-3 !h-3">{{scenario.runState() === 'RUNNING' ? 'pause' : 'play_arrow'}}</mat-icon>
                   {{scenario.runState() === 'RUNNING' ? 'PAUSE' : 'PLAY'}}
                 </button>
                 @if (sensorFeed.isReplay()) {
                   <span class="text-[7px] font-black uppercase tracking-widest text-boreal-green animate-pulse">● REPLAY</span>
                 }
               </div>
               <div class="flex items-center gap-4">
                 <span class="font-mono tabular-nums text-boreal-text-primary text-[10px]">T+{{formatSimTime(scenario.simTime())}}</span>
                 <span>{{scenario.currentPhase()?.name}}</span>
                 <button (click)="timelineExpanded.set(false)" class="flex items-center text-boreal-text-muted hover:text-boreal-text-primary transition-colors">
                   <mat-icon class="!text-[12px] !w-3 !h-3">close</mat-icon>
                 </button>
               </div>
             </div>
             <!-- Expanded scrubbable track (taller) -->
             <div class="relative overflow-hidden select-none shrink-0" style="height:140px"
                  [class.cursor-grab]="!isScrubbing()"
                  [class.cursor-grabbing]="isScrubbing()"
                  (mousedown)="onTimelineScrubStart($event)">
               <div class="absolute left-1/2 top-0 bottom-0 w-[1px] bg-boreal-blue/60 z-20 pointer-events-none"></div>
               <div class="absolute left-1/2 top-2 w-2 h-2 -translate-x-1/2 bg-boreal-blue rounded-full z-20 pointer-events-none shadow-[0_0_8px_var(--boreal-blue)]"></div>
               <div class="absolute top-0 bottom-0" style="width:7200px" [style.left]="timelineStripLeft()">
                 <div class="absolute left-0 right-0 top-1/2 h-[1px] bg-boreal-border opacity-20"></div>
                 @for (m of timelineMinorTicks; track m) {
                   <div class="absolute bottom-4 flex flex-col items-center" [style.left.px]="m * 48">
                     <div class="h-3 w-[1px] bg-boreal-text-muted opacity-20"></div>
                   </div>
                 }
                 @for (m of timelineMajorTicks; track m) {
                   <div class="absolute bottom-3 flex flex-col items-center" [style.left.px]="m * 48">
                     <div class="h-6 w-[1px] bg-boreal-text-muted opacity-40"></div>
                     <span class="text-[8px] font-mono text-boreal-text-muted opacity-60 mt-1">T+{{m}}m</span>
                   </div>
                 }
                 @for (evt of timelineEvents(); track evt.id) {
                   <div class="absolute flex flex-col items-center gap-0.5 cursor-pointer"
                        style="top:8px"
                        [style.left.px]="(evt.simTime! / 60) * 48"
                        [title]="evt.actor + ': ' + evt.action">
                     <div class="w-2 h-2 rounded-full shadow-sm" [class]="timelineEventColor(evt)"></div>
                     <div class="h-6 w-[1px] opacity-30" [class]="timelineEventColor(evt)"></div>
                     <span class="text-[7px] font-mono opacity-60 w-14 text-center truncate leading-none">{{evt.action}}</span>
                   </div>
                 }
               </div>
             </div>
             <!-- Event log -->
             <div class="flex-grow border-t border-boreal-border overflow-y-auto">
               @if (timelineEvents().length === 0) {
                 <div class="flex items-center justify-center h-full text-[9px] text-boreal-text-muted uppercase tracking-widest opacity-40">No events recorded</div>
               }
               @for (evt of timelineEvents(); track evt.id) {
                 <div class="flex items-center gap-3 px-3 py-1.5 border-b border-boreal-border/30 hover:bg-boreal-panel-muted/30 transition-colors"
                      [class.bg-boreal-blue/5]="Math.abs(evt.simTime! - scenario.simTime()) < 30">
                   <div class="w-1.5 h-1.5 rounded-full shrink-0" [class]="timelineEventColor(evt)"></div>
                   <span class="font-mono text-[8px] text-boreal-text-muted tabular-nums shrink-0">T+{{formatSimTime(evt.simTime!)}}</span>
                   <span class="text-[8px] text-boreal-text-muted uppercase tracking-wider shrink-0 w-16 truncate">{{evt.actor}}</span>
                   <span class="text-[8px] text-boreal-text-primary truncate">{{evt.action}}</span>
                 </div>
               }
             </div>
           </div>
         }

         <!-- Bottom Engagement Timeline -->
         <div class="h-24 border-t border-boreal-border bg-boreal-panel-muted/50 flex flex-col z-20 shadow-[0_-10px_30px_var(--boreal-shadow)]">
            <!-- Header -->
            <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted py-1 px-3 flex justify-between items-center shrink-0">
              <div class="flex items-center gap-3">
                <span>Engagement Timeline</span>
                <button (click)="togglePlayback()"
                  class="flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[7px] font-black uppercase tracking-widest transition-all"
                  [class.bg-boreal-green/10]="scenario.runState() !== 'RUNNING'"
                  [class.border-boreal-green/30]="scenario.runState() !== 'RUNNING'"
                  [class.text-boreal-green]="scenario.runState() !== 'RUNNING'"
                  [class.bg-boreal-amber/10]="scenario.runState() === 'RUNNING'"
                  [class.border-boreal-amber/30]="scenario.runState() === 'RUNNING'"
                  [class.text-boreal-amber]="scenario.runState() === 'RUNNING'"
                >
                  <mat-icon class="!text-[10px] !w-3 !h-3">{{scenario.runState() === 'RUNNING' ? 'pause' : 'play_arrow'}}</mat-icon>
                  {{scenario.runState() === 'RUNNING' ? 'PAUSE' : 'PLAY'}}
                </button>
                @if (sensorFeed.isReplay()) {
                  <span class="text-[7px] font-black uppercase tracking-widest text-boreal-green animate-pulse">● REPLAY</span>
                }
              </div>
              <div class="flex items-center gap-4">
                <span class="font-mono tabular-nums text-boreal-text-primary text-[10px]">T+{{formatSimTime(scenario.simTime())}}</span>
                <span>{{scenario.currentPhase()?.name}}</span>
                <button (click)="timelineExpanded.set(!timelineExpanded())" class="flex items-center text-boreal-text-muted hover:text-boreal-blue transition-colors" [title]="timelineExpanded() ? 'Collapse' : 'Expand timeline'">
                  <mat-icon class="!text-[12px] !w-3 !h-3">{{timelineExpanded() ? 'expand_less' : 'expand_more'}}</mat-icon>
                </button>
              </div>
            </div>
            <!-- Scrolling timeline track -->
            <div class="flex-grow relative overflow-hidden select-none"
                 [class.cursor-grab]="!isScrubbing()"
                 [class.cursor-grabbing]="isScrubbing()"
                 (mousedown)="onTimelineScrubStart($event)">
              <!-- "Now" cursor — fixed at center -->
              <div class="absolute left-1/2 top-0 bottom-0 w-[1px] bg-boreal-blue/60 z-20 pointer-events-none"></div>
              <div class="absolute left-1/2 top-1 w-1.5 h-1.5 -translate-x-1/2 bg-boreal-blue rounded-full z-20 pointer-events-none"></div>
              <!-- Scrolling strip (48px/min × 150min = 7200px) -->
              <div class="absolute top-0 bottom-0" style="width:7200px" [style.left]="timelineStripLeft()">
                <!-- Baseline rule -->
                <div class="absolute left-0 right-0 top-1/2 h-[1px] bg-boreal-border opacity-20"></div>
                <!-- Minor ticks every 2 minutes -->
                @for (m of timelineMinorTicks; track m) {
                  <div class="absolute bottom-3 flex flex-col items-center" [style.left.px]="m * 48">
                    <div class="h-2 w-[1px] bg-boreal-text-muted opacity-20"></div>
                  </div>
                }
                <!-- Major ticks every 10 minutes -->
                @for (m of timelineMajorTicks; track m) {
                  <div class="absolute bottom-2 flex flex-col items-center" [style.left.px]="m * 48">
                    <div class="h-4 w-[1px] bg-boreal-text-muted opacity-40"></div>
                    <span class="text-[7px] font-mono text-boreal-text-muted opacity-50 mt-0.5">T+{{m}}m</span>
                  </div>
                }
                <!-- Engagement events from audit log -->
                @for (evt of timelineEvents(); track evt.id) {
                  <div class="absolute flex flex-col items-center gap-0.5 cursor-pointer"
                       style="top:4px"
                       [style.left.px]="(evt.simTime! / 60) * 48"
                       [title]="evt.actor + ': ' + evt.action">
                    <div class="w-1.5 h-1.5 rounded-full" [class]="timelineEventColor(evt)"></div>
                    <div class="h-3 w-[1px] opacity-30" [class]="timelineEventColor(evt)"></div>
                    <span class="text-[6px] font-mono opacity-50 w-10 text-center truncate leading-none">{{evt.action}}</span>
                  </div>
                }
              </div>
            </div>
         </div>
      </div>

      <!-- Right Recommendation Stack -->
      <app-tactical-recommendations />
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .w-85 { width: 340px; }
    .tactical-panel { min-width: 0; }

    @media (max-width: 1200px) {
      .w-85 { width: 300px; }
    }

    @media (max-width: 960px) {
      :host { height: auto; }

      .tactical-shell {
        flex-direction: column;
        overflow-y: auto;
      }

      .tactical-panel--queue,
      .tactical-panel--recommendations {
        width: 100%;
        min-width: 0;
        max-height: 34rem;
      }

      .tactical-panel--queue {
        order: 1;
        border-right: 0;
        border-bottom: 1px solid var(--boreal-border);
      }

      .tactical-map {
        order: 2;
        min-height: 60vh;
      }

      .tactical-panel--recommendations {
        order: 3;
        border-left: 0;
        border-top: 1px solid var(--boreal-border);
        box-shadow: 0 -20px 40px var(--boreal-shadow);
      }

      .tactical-intent-toast {
        top: 1rem !important;
        left: 1rem !important;
        right: 1rem;
      }
    }

    @media (max-width: 640px) {
      .tactical-status-strip {
        bottom: 1rem;
        height: auto;
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TacticalConsole implements OnInit, OnDestroy {
    tactical = inject(TacticalStore);
    capabilityStore = inject(CapabilityLayerStore);
    policy = inject(PolicyStore);
    readiness = inject(ReadinessStore);
    scenario = inject(ScenarioStore);
    orchestration = inject(OrchestrationStore);
    orchestrator = inject(CapabilityOrchestrator);
    audit      = inject(AuditLogger);
    api        = inject(SteelApiService);
    layers     = inject(MapLayerStore);
    logistics  = inject(LogisticsStore);
    sensorFeed = inject(SensorFeedStore);
    decisionFabric = inject(DecisionFabricStore);
    directiveQueue = inject(OperationalDirectiveQueueService);

    mapFeatures = ENGAGEMENT_MAP_FEATURES;

    private _clockInterval: ReturnType<typeof setInterval> | null = null;
    private _scrubMoveListener: ((e: MouseEvent) => void) | null = null;
    private _scrubUpListener: (() => void) | null = null;

    ngOnInit() {
      this._clockInterval = setInterval(() => {
        if (this.scenario.runState() === 'RUNNING') {
          this.scenario.tick();
        }
      }, 1000);
    }

    ngOnDestroy() {
      if (this._clockInterval) clearInterval(this._clockInterval);
      if (this._scrubMoveListener) window.removeEventListener('mousemove', this._scrubMoveListener);
      if (this._scrubUpListener) window.removeEventListener('mouseup', this._scrubUpListener);
    }

    // Map Navigation & UI State
    posX = signal(0);
    posY = signal(0);
    zoomLevel = signal(1);

    isDragging = signal(false);
    lastMouseX = 0;
    lastMouseY = 0;
    private readonly viewboxWidth = 1670;
    private readonly viewboxHeight = 1300;

    // IFZ mode toggle labels shown in map controls
    readonly ifzModes = [
      { value: 'ENGAGED_ONLY' as const, label: 'Engaged' },
      { value: 'ALL_ACTIVE' as const,   label: 'All Active' },
    ];

    degradedMapMode = computed(() =>
      this.sensorFeed.connectionStatus() === 'DISCONNECTED' && this.tactical.tracks().length > 0
    );

    lastSyncLabel = computed(() => {
      const timestamp = this.tactical.sync().lastSyncedAt ?? this.decisionFabric.sync().lastSyncedAt;
      if (!timestamp) return 'Never synced';
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });

    degradedHeatCells = computed<DegradedHeatCell[]>(() => {
      if (!this.degradedMapMode()) return [];

      const tracks = this.tactical.tracks();
      const pendingTrackIds = this.directiveQueue.pendingTrackIds();
      const terrain = this.mapFeatures.filter(
        feature => feature.recordType === 'terrain' && feature.coordinates?.length
      );
      const cols = 14;
      const rows = 10;
      const cellWidth = this.viewboxWidth / cols;
      const cellHeight = this.viewboxHeight / rows;
      const cells: DegradedHeatCell[] = [];

      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          const centerX = (col + 0.5) * cellWidth;
          const centerY = (row + 0.5) * cellHeight;
          const onTerrain = terrain.some(feature => this.pointInPolygon(centerX, centerY, feature.coordinates ?? []));
          if (!onTerrain) continue;

          let score = 0;
          let queued = false;
          for (const track of tracks) {
            const dx = centerX - track.geometry.x;
            const dy = centerY - track.geometry.y;
            const distance = Math.hypot(dx, dy);
            const distanceWeight = Math.max(0, 1 - distance / 620);
            if (distanceWeight <= 0) continue;

            const headingRadians = (track.geometry.heading * Math.PI) / 180;
            const headingVectorX = Math.cos(headingRadians);
            const headingVectorY = Math.sin(headingRadians);
            const normalizedDistance = distance === 0 ? 1 : distance;
            const forwardBias = Math.max(0.35, ((dx / normalizedDistance) * headingVectorX) + ((dy / normalizedDistance) * headingVectorY));
            const intentWeight = this.intentWeight(track);
            const confidenceWeight = Math.max(0.3, track.confidence);
            const urgencyWeight = Math.max(0.25, 1 - (track.timeToTarget / 420));
            const queueWeight = pendingTrackIds.has(track.id) ? 1.2 : 1;

            if (pendingTrackIds.has(track.id)) queued = true;
            score += distanceWeight * forwardBias * intentWeight * confidenceWeight * urgencyWeight * queueWeight;
          }

          const cappedScore = Math.min(1, score);
          const zone = cappedScore >= 0.5 ? 'INVESTIGATE' : (cappedScore >= 0.22 ? 'CAUTION' : 'NO-CONFIDENCE');
          const opacity = zone === 'INVESTIGATE' ? 0.38 : (zone === 'CAUTION' ? 0.2 : 0.08);
          cells.push({
            id: `cell-${col}-${row}`,
            x: col * cellWidth,
            y: row * cellHeight,
            width: cellWidth,
            height: cellHeight,
            zone,
            opacity,
            score: cappedScore,
            queued,
          });
        }
      }

      return cells;
    });

    // Tracks to render IFZ circles for, based on current display mode
    ifzTracks = computed(() => {
      const mode   = this.layers.ifzMode();
      const tracks = this.tactical.tracks();
      if (mode === 'ENGAGED_ONLY') return tracks.filter(t => t.status === 'ENGAGED');
      return tracks.filter(t => t.status !== 'NEUTRALIZED');
    });

    clusterHullPointsString = computed(() => {
        const threats = this.tactical.activeThreats();
        if (threats.length < 3) return '';

        const points = threats.map(t => ({ x: t.geometry.x, y: t.geometry.y }));
        points.sort((a, b) => a.x - b.x || a.y - b.y);

        const cross = (o: {x: number, y: number}, a: {x: number, y: number}, b: {x: number, y: number}) => 
            (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

        const lower: {x: number, y: number}[] = [];
        for (const p of points) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
                lower.pop();
            }
            lower.push(p);
        }

        const upper: {x: number, y: number}[] = [];
        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
                upper.pop();
            }
            upper.push(p);
        }

        upper.pop();
        lower.pop();
        const hull = lower.concat(upper);

        return hull.map(p => `${p.x},${p.y}`).join(' ');
    });

    // ── Engagement Timeline ───────────────────────────────────────────────────
    // 48px per minute; strip spans 150 minutes (7200px wide)
    readonly timelineMinorTicks = Array.from({ length: 76 }, (_, i) => i * 2);
    readonly timelineMajorTicks = Array.from({ length: 16 }, (_, i) => i * 10);

    timelineStripLeft = computed(() =>
      `calc(50% - ${(this.scenario.simTime() / 60 * 48).toFixed(1)}px)`
    );

    timelineEvents = computed(() =>
      this.audit.logs().filter(e => e.simTime != null)
    );

    timelineEventColor(evt: AuditEvent): string {
      switch (evt.category) {
        case 'TACTICAL':  return 'bg-boreal-red';
        case 'POLICY':    return 'bg-boreal-blue';
        case 'LAB':       return 'bg-boreal-amber';
        case 'READINESS': return 'bg-boreal-green';
        default:          return 'bg-boreal-text-muted';
      }
    }

    isScrubbing = signal(false);
    timelineExpanded = signal(false);
    readonly Math = Math;
    private _scrubStartX = 0;
    private _scrubStartTime = 0;
    private _wasRunning = false;

    onTimelineScrubStart(event: MouseEvent): void {
      event.preventDefault();
      this._scrubStartX = event.clientX;
      this._scrubStartTime = this.scenario.simTime();
      this._wasRunning = this.scenario.runState() === 'RUNNING';
      if (this._wasRunning) this.scenario.setRunState('PAUSED');
      this.isScrubbing.set(true);

      this._scrubMoveListener = (e: MouseEvent) => {
        const deltaSeconds = Math.round(-(e.clientX - this._scrubStartX) / 48 * 60);
        this.scenario.setSimTime(Math.max(0, Math.min(9000, this._scrubStartTime + deltaSeconds)));
      };

      this._scrubUpListener = () => {
        this.isScrubbing.set(false);
        if (this._wasRunning) this.scenario.setRunState('RUNNING');
        if (this._scrubMoveListener) window.removeEventListener('mousemove', this._scrubMoveListener);
        if (this._scrubUpListener) window.removeEventListener('mouseup', this._scrubUpListener);
        this._scrubMoveListener = null;
        this._scrubUpListener = null;
      };

      window.addEventListener('mousemove', this._scrubMoveListener);
      window.addEventListener('mouseup', this._scrubUpListener);
    }

    togglePlayback(): void {
      if (this.scenario.runState() === 'RUNNING') {
        this.scenario.setRunState('PAUSED');
        this.sensorFeed.setFeedMode('LIVE');
      } else {
        this.scenario.setRunState('RUNNING');
        this.sensorFeed.setFeedMode('REPLAY');
      }
    }

    formatSimTime(seconds: number): string {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    vm = computed(() => {
        return {
            simTime: this.scenario.simTime()
        };
    });

    mapTransform = computed(() => {
        return `translate(${this.posX()}, ${this.posY()}) scale(${this.zoomLevel()})`;
    });

    onWheel(event: WheelEvent) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.min(Math.max(this.zoomLevel() + delta, 0.5), 10);
        this.zoomLevel.set(newZoom);
    }

    onMouseDown(event: MouseEvent) {
        this.isDragging.set(true);
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    @HostListener('window:mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
        if (!this.isDragging()) return;

        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;

        this.posX.update(v => v + deltaX);
        this.posY.update(v => v + deltaY);

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    @HostListener('window:mouseup')
    onMouseUp() {
        this.isDragging.set(false);
    }

    zoomIn() {
        this.zoomLevel.update(v => Math.min(v + 0.5, 10));
    }

    zoomOut() {
        this.zoomLevel.update(v => Math.max(v - 0.5, 0.5));
    }

    resetView() {
        this.zoomLevel.set(1);
        this.posX.set(0);
        this.posY.set(0);
    }

    selectTrack(id: string) {
        this.tactical.selectTrack(id);
        const track = this.tactical.selectedTrack();
        if (track) {
            this.focusOnPoint(track.geometry.x, track.geometry.y);
        }
    }

    // IFZ / overlay helpers
    getIFZRadius(track: ThreatTwin): number {
        // Proxy for kinetic reach: higher velocity + shorter time-to-target = larger zone
        return Math.max(28, Math.min(120, track.geometry.velocity / 5 + (280 - track.timeToTarget) / 5));
    }

    getIntentColor(intent: ThreatTwin['intent']): string {
        switch (intent) {
            case 'STRIKE':     return 'var(--boreal-red)';
            case 'SATURATION': return 'var(--boreal-amber)';
            case 'FEINT':      return 'var(--boreal-amber)';
            case 'PROBE':      return 'var(--boreal-blue)';
            case 'DECOY':      return 'var(--color-zinc-500, #71717a)';
            default:           return 'var(--boreal-text-muted)';
        }
    }

    degradedCellColor(zone: DegradedHeatCell['zone']): string {
        switch (zone) {
            case 'INVESTIGATE': return 'var(--boreal-red)';
            case 'CAUTION': return 'var(--boreal-amber)';
            default: return 'var(--boreal-text-muted)';
        }
    }

    intentWeight(track: ThreatTwin): number {
        switch (track.intent) {
            case 'STRIKE': return 1;
            case 'SATURATION': return 0.88;
            case 'FEINT': return 0.62;
            case 'PROBE': return 0.48;
            case 'DECOY': return 0.28;
            default: return 0.4;
        }
    }

    formatCoordinates(coords: [number, number][]): string {
        return coords.map(c => `${c[0]},${c[1]}`).join(' ');
    }

    getSupplyNodeColor(node: SupplyNode): string {
        if (node.status === 'OFFLINE')    return 'var(--boreal-text-muted)';
        if (node.status === 'DISRUPTED')  return 'var(--boreal-red)';
        if (node.status === 'DEGRADED')   return 'var(--boreal-amber)';
        return 'var(--boreal-green)';
    }

    /** Hex path centered at 0,0 with given radius. */
    hexPath(r: number): string {
        const pts = Array.from({ length: 6 }, (_, i) => {
            const a = (Math.PI / 3) * i - Math.PI / 6;
            return `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`;
        });
        return `M${pts.join('L')}Z`;
    }

    corridorPoints(corridor: SupplyCorridor): string {
        return corridor.waypoints.map(p => `${p.x},${p.y}`).join(' ');
    }

    corridorColor(corridor: SupplyCorridor): string {
        if (corridor.status === 'BLOCKED')    return 'var(--boreal-red)';
        if (corridor.status === 'CONTESTED')  return 'var(--boreal-amber)';
        return 'var(--boreal-green)';
    }

    getTrackTransform(track: ThreatTwin): string {
        return `translate(${track.geometry.x}, ${track.geometry.y})`;
    }

    getBaseReadiness(name: string): number {
        const base = this.readiness.bases().find(b => b.name === name);
        return base ? base.readiness : 0.8;
    }

    getEngagementPath(track: ThreatTwin): { targetX: number, targetY: number } | null {
        const assignment = this.policy.selectedCOA()?.assignments.find(a => a.threatId === track.id);
        if (assignment) {
            const basePoint = this.getBasePoint(assignment.baseId);
            if (basePoint) {
                return {
                    targetX: (track.geometry.x + basePoint.x) / 2,
                    targetY: (track.geometry.y + basePoint.y) / 2
                };
            }
        }

        // Default to a vector showing predicted track if no assignment or no mapped base
        return {
            targetX: track.geometry.x + Math.cos(track.geometry.heading * Math.PI / 180) * 100,
            targetY: track.geometry.y + Math.sin(track.geometry.heading * Math.PI / 180) * 100
        };
    }

    private getBasePoint(baseId: string): { x: number; y: number } | null {
        const baseName = this.readiness.bases().find(b => b.id === baseId)?.name;
        if (!baseName) return null;

        const feature = this.mapFeatures.find(f =>
            f.recordType === 'location' &&
            f.subtype === 'air_base' &&
            f.name === baseName &&
            f.x !== undefined &&
            f.y !== undefined
        );

        return feature?.x !== undefined && feature?.y !== undefined
            ? { x: feature.x, y: feature.y }
            : null;
    }

    private focusOnPoint(x: number, y: number): void {
        const centeredX = (this.viewboxWidth / 2) - (x * this.zoomLevel());
        const centeredY = (this.viewboxHeight / 2) - (y * this.zoomLevel());
        this.posX.set(centeredX);
        this.posY.set(centeredY);
    }

    shouldShowLabel(feature: MapFeature, zoom: number): boolean {
        if (feature.subtype === 'air_base' || feature.subtype === 'capital') return true;
        if (zoom > 2) return true;
        return false;
    }

    pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];
            const intersects = ((yi > y) !== (yj > y))
                && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || 1e-6)) + xi);
            if (intersects) inside = !inside;
        }
        return inside;
    }
}
