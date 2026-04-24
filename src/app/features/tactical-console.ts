import { Component, ChangeDetectionStrategy, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TacticalStore } from '../core/state/tactical.store';
import { PolicyStore } from '../core/state/policy.store';
import { ReadinessStore } from '../core/state/readiness.store';
import { ScenarioStore } from '../core/state/scenario.store';
import { OrchestrationStore } from '../core/state/orchestration.store';
import { MapLayerStore } from '../core/state/map-layer.store';
import { LogisticsStore } from '../core/state/logistics.store';
import { CapabilityOrchestrator } from '../core/services/capability-orchestrator';
import { AuditLogger, AuditEvent } from '../core/services/audit-logger';
import { BdtApiService } from '../core/services/bdt-api.service';
import { SensorFeedStore } from '../core/state/sensor-feed.store';
import { ThreatTwin, COATwin, MapFeature } from '../shared/domain/models';
import { SupplyNode, SupplyCorridor } from '../shared/domain/logistics-ontology';

import { ENGAGEMENT_MAP_FEATURES } from '../shared/domain/engagement-map.data';

@Component({
  selector: 'app-tactical-console',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full w-full flex overflow-hidden">

      <!-- HITL Manual Confirmation Modal -->
      @if (_pendingConfirm()) {
        <div class="absolute inset-0 z-[200] bg-black/70 flex items-center justify-center backdrop-blur-sm">
          <div class="bg-boreal-panel border border-boreal-red/50 rounded-sm p-8 shadow-[0_0_60px_rgba(239,68,68,0.2)] max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <div class="flex items-center gap-3 mb-4">
              <mat-icon class="text-boreal-red !text-2xl !w-6 !h-6">lock</mat-icon>
              <div class="flex flex-col">
                <span class="text-boreal-red font-black text-xs uppercase tracking-[0.2em]">HITL Authority Active</span>
                <span class="text-[9px] text-boreal-text-muted font-mono uppercase tracking-wider">Manual Confirmation Required</span>
              </div>
            </div>
            @if (recommendation(); as rec) {
              <div class="mb-5 p-3 bg-boreal-canvas rounded-sm border border-boreal-border space-y-1">
                <div class="text-[8px] text-boreal-text-muted uppercase tracking-widest">Pending Engagement</div>
                <div class="text-[11px] font-black text-boreal-text-primary uppercase tracking-wider">{{ rec.trackId }}</div>
                <div class="text-[10px] text-boreal-text-secondary">{{ rec.title }}</div>
                <div class="flex gap-3 pt-1 text-[8px] font-mono text-boreal-text-muted">
                  <span>Base: <span class="text-boreal-text-secondary font-bold">{{ rec.baseName }}</span></span>
                  <span>Conf: <span class="text-boreal-text-secondary font-bold">{{ rec.confidence }}%</span></span>
                </div>
              </div>
            }
            <p class="text-[10px] text-boreal-text-secondary leading-relaxed mb-6 italic">
              Policy authority is <span class="font-black text-boreal-text-primary">MANUAL (HITL)</span>.
              All engagements require explicit operator confirmation before execution.
            </p>
            <div class="flex gap-3">
              <button (click)="cancelConfirm()"
                class="flex-grow py-2.5 bg-transparent border border-boreal-border rounded-sm text-boreal-text-muted text-[10px] font-bold uppercase tracking-widest hover:text-boreal-text-primary transition-colors">
                CANCEL
              </button>
              <button (click)="confirmManualEngagement()"
                class="flex-grow py-2.5 bg-boreal-red border border-boreal-red rounded-sm text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-boreal-red/20">
                AUTHORIZE
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Deployment Status Overlay -->
      @if (orchestration.publishedIntent(); as intent) {
          <div class="absolute top-18 left-90 z-50 px-4 py-2 bg-boreal-blue/20 backdrop-blur-xl border border-boreal-blue/40 rounded shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
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
      <div class="w-85 border-r border-boreal-border bg-boreal-panel flex flex-col z-20 shadow-2xl">
        <div class="panel-header uppercase tracking-widest text-[10px] text-boreal-text-muted flex items-center justify-between">
            <span>Threat Queue</span>
            <span class="bg-boreal-red/10 text-boreal-red px-1 rounded">{{tactical.activeThreats().length}} ACTIVE</span>
        </div>
        
        <div class="flex-grow overflow-y-auto select-none">
            @for (track of tactical.imminentThreats(); track track.id) {
                <button 
                    (click)="selectTrack(track.id)"
                    [class.bg-boreal-panel-elevated]="tactical.selectedTrackId() === track.id"
                    [class.border-l-3]="tactical.selectedTrackId() === track.id"
                    [class.border-boreal-blue]="tactical.selectedTrackId() === track.id"
                    class="w-full text-left p-4 border-b border-boreal-border hover:bg-boreal-panel-muted/50 transition-colors cursor-pointer group focus:outline-none focus:bg-boreal-panel-muted/50"
                >
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-mono text-boreal-text-muted">{{track.id}}</span>
                            <span class="text-xs font-bold leading-none" [class.text-boreal-red]="track.class === 'MISSILE'">{{track.class}}</span>
                        </div>
                        <span class="text-[10px] font-mono tabular-nums" [class.text-boreal-red]="track.timeToTarget < 100" [class.text-boreal-amber]="track.timeToTarget >= 100">
                            {{track.timeToTarget}}s
                        </span>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <div class="flex gap-1 items-center">
                            <span class="px-1.5 py-0.5 rounded bg-boreal-canvas/40 text-[9px] font-mono border border-boreal-border text-boreal-text-secondary uppercase">
                                {{track.intent}}
                            </span>
                            <span class="text-[9px] text-boreal-text-muted font-medium italic">Conf: {{track.confidence * 100 | number:'1.0-0'}}%</span>
                        </div>
                        <mat-icon class="!text-xs text-boreal-text-muted opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</mat-icon>
                    </div>
                </button>
            } @empty {
                <div class="p-8 text-center text-boreal-text-muted text-xs italic">No active tracks detected.</div>
            }
        </div>

        <div class="p-3 bg-boreal-panel-muted/20 border-t border-boreal-border">
             <div class="flex items-center justify-between text-[10px] text-boreal-text-muted mb-2">
                <span>SECTOR 4 STATUS</span>
                <span class="text-boreal-green">STABLE</span>
             </div>
             <div class="h-1 w-full bg-boreal-panel-elevated rounded-full">
                <div class="h-full bg-boreal-green w-3/4"></div>
             </div>
        </div>
      </div>

      <!-- Center Map Area -->
      <div class="flex-grow bg-boreal-canvas relative overflow-hidden flex flex-col">
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

         <!-- Status Strip -->
         <div class="absolute bottom-28 left-4 right-4 z-40 h-8 flex items-center justify-between gap-4 pointer-events-none">
            <div class="flex items-center gap-2 bg-boreal-panel/90 backdrop-blur-md border border-boreal-border rounded px-3 py-1 shadow-xl pointer-events-auto">
               <div class="flex items-center gap-1.5 border-r border-boreal-border pr-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-boreal-blue animate-pulse"></span>
                  <span class="text-[9px] font-mono text-boreal-text-primary font-bold">OP_MAP_V1</span>
               </div>
               <div class="flex items-center gap-2">
                  <span class="text-[8px] font-mono text-boreal-text-muted uppercase">Zoom: {{zoomLevel().toFixed(2)}}x</span>
                  <span class="text-[8px] font-mono text-boreal-text-muted uppercase">Tracks: {{tactical.activeThreats().length}}</span>
               </div>
            </div>
            
            @if (tactical.selectedTrack(); as track) {
                <div class="flex items-center gap-3 bg-boreal-red/10 backdrop-blur-md border border-boreal-red/30 rounded px-4 py-1 shadow-xl animate-in slide-in-from-bottom-2 duration-300 pointer-events-auto">
                   <mat-icon class="text-boreal-red !w-4 !h-4 !text-[14px]">priority_high</mat-icon>
                   <div class="flex flex-col">
                      <span class="text-[8px] font-black text-boreal-red uppercase tracking-widest leading-tight">Intercept Priority</span>
                      <span class="text-[10px] font-mono text-boreal-text-primary font-bold leading-tight">{{ track.id }} ({{ track.class }}) - T: {{ track.timeToTarget }}s</span>
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
                    @if (layers.isLayerVisible('engagement_vectors')) {
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

                    <!-- IFZ Polygons Layer: instantaneous fire zone around each threat -->
                    @if (layers.isLayerVisible('ifz_polygons')) {
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

                    <!-- Threat Track Layer -->
                    @if (layers.isLayerVisible('threat_tracks')) {
                        @for (track of tactical.tracks(); track track.id) {
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
                                            <text x="4" y="-3" class="text-[8px] font-mono fill-boreal-blue font-black uppercase tracking-widest">TRK_{{track.id}}</text>
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
                                        {{track.id}}
                                    </text>
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
                  <mat-icon class="!text-[12px] !w-3 !h-3">{{timelineExpanded() ? 'expand_more' : 'expand_less'}}</mat-icon>
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
      <div class="w-85 border-l border-boreal-border bg-boreal-panel flex flex-col overflow-y-auto z-20 shadow-[-20px_0_40px_var(--boreal-shadow)]">
        <div class="panel-header uppercase tracking-widest text-[10px] text-boreal-text-muted">Recommendations</div>
        
        <div class="flex-grow p-4 flex flex-col gap-4">
            @if (recommendation(); as rec) {
                <!-- Recommendation Card -->
                <div class="flex flex-col gap-4">
                    <div class="p-4 rounded-sm border shadow-lg transition-all" 
                         [class.border-boreal-blue/20]="rec.currentAction === 'PENDING'"
                         [class.bg-boreal-blue/5]="rec.currentAction === 'PENDING'"
                         [class.border-boreal-green/40]="rec.currentAction === 'ACCEPTED'"
                         [class.bg-boreal-green/5]="rec.currentAction === 'ACCEPTED'"
                         [class.border-boreal-amber/40]="rec.currentAction === 'HELD'"
                         [class.bg-boreal-amber/5]="rec.currentAction === 'HELD'">
                        
                        <header class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-mono text-boreal-blue uppercase font-bold tracking-[0.2em]">
                                    {{ rec.currentAction === 'PENDING' ? 'Top Recommended COA' : 'Engagement Active' }}
                                </span>
                                @if (rec.currentAction !== 'PENDING') {
                                    <span class="px-1.5 py-0.5 bg-boreal-blue/20 text-boreal-blue text-[8px] font-black rounded-sm border border-boreal-blue/30">{{ rec.currentAction }}</span>
                                }
                            </div>
                            <span class="flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-boreal-green shadow-[0_0_8px_var(--boreal-green)]"></span>
                                <span class="text-[9px] text-boreal-green font-bold tracking-widest">{{ rec.confidence }}% CONF</span>
                            </span>
                        </header>
                        
                        <div class="mb-4">
                            <h3 class="text-xs font-black text-boreal-text-primary mb-2 uppercase tracking-tight">{{ rec.title }}</h3>
                            <div class="p-3 bg-boreal-canvas/40 border border-boreal-border rounded-sm relative overflow-hidden group/rationale">
                               <div class="absolute inset-y-0 left-0 w-0.5 bg-boreal-blue opacity-50"></div>
                               <span class="text-boreal-blue font-black uppercase text-[8px] block mb-2 tracking-widest">Decision Rationale</span>
                               <p class="text-[11px] text-boreal-text-secondary leading-relaxed italic">
                                {{ rec.rationale }}
                               </p>
                            </div>
                        </div>

                        <!-- Intent Distribution -->
                        <div class="mb-5 p-3 bg-boreal-panel-muted/20 border border-boreal-border rounded-sm">
                            <span class="text-[8px] font-black text-boreal-text-muted uppercase tracking-widest block mb-4">Intent Attribution (Live)</span>
                            <div class="space-y-3">
                                @for (item of rec.intentDist; track item.label) {
                                    <div class="flex items-center gap-3" [class.opacity-40]="item.label === 'DECOY'">
                                        <span class="text-[9px] text-boreal-text-muted w-16 font-mono font-bold uppercase tracking-tighter">{{ item.label }}</span>
                                        <div class="flex-grow h-1 bg-boreal-canvas rounded-full overflow-hidden border border-boreal-border">
                                            <div class="h-full bg-boreal-blue shadow-[0_0_8px_var(--boreal-blue)]" [style.width.%]="item.value"></div>
                                        </div>
                                        <span class="text-[9px] font-mono text-boreal-text-primary w-8 text-right font-bold">{{ item.value | number:'1.0-0' }}%</span>
                                    </div>
                                }
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-boreal-border">
                            <div class="flex flex-col gap-1">
                                <span class="text-[8px] text-boreal-text-muted uppercase font-bold tracking-widest">Base Node</span>
                                <span class="text-[11px] font-black text-boreal-text-primary uppercase tracking-tight">{{ rec.baseName }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-[8px] text-boreal-text-muted uppercase font-bold tracking-widest">Effector</span>
                                <span class="text-[11px] font-black text-boreal-text-primary uppercase tracking-tight">{{ rec.effectorType }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-[8px] text-boreal-text-muted uppercase font-bold tracking-widest">Readiness Drift</span>
                                <span class="text-[11px] font-mono font-black text-boreal-amber tracking-tighter">{{ rec.futureCost }}</span>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-[8px] text-boreal-text-muted uppercase font-bold tracking-widest">Asymmetry</span>
                                <span class="text-[11px] font-mono font-black text-boreal-green tracking-tighter">1:{{ rec.asymmetry }}</span>
                            </div>
                        </div>

                        <!-- Authority badge — shows current mode above action buttons -->
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-[7px] text-boreal-text-muted uppercase tracking-widest">Authority:</span>
                            @let auth = policy.activePolicy()?.guardrails?.engagementAuthority ?? 'SEMI';
                            <span class="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border"
                                [class.text-boreal-red]="auth === 'MANUAL'"
                                [class.border-boreal-red/40]="auth === 'MANUAL'"
                                [class.bg-boreal-red/10]="auth === 'MANUAL'"
                                [class.text-boreal-amber]="auth === 'SEMI'"
                                [class.border-boreal-amber/40]="auth === 'SEMI'"
                                [class.bg-boreal-amber/10]="auth === 'SEMI'"
                                [class.text-boreal-blue]="auth === 'AUTO'"
                                [class.border-boreal-blue/40]="auth === 'AUTO'"
                                [class.bg-boreal-blue/10]="auth === 'AUTO'"
                            >{{ auth === 'MANUAL' ? 'HITL' : auth === 'SEMI' ? 'HOTL' : 'HNLT' }} · {{ auth }}</span>
                        </div>

                        <div class="flex gap-2">
                            <button
                                (click)="acceptRecommendation()"
                                [disabled]="rec.currentAction !== 'PENDING'"
                                class="flex-grow py-3 bg-boreal-blue border border-boreal-blue shadow-lg shadow-boreal-blue/20 text-white rounded-sm text-[10px] font-black tracking-[0.2em] uppercase hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
                            >
                                {{ rec.currentAction === 'ACCEPTED' ? 'ENGAGEMENT_AUTHORIZED' : 'AUTHORIZE_INTERCEPT' }}
                            </button>
                            <button 
                                (click)="holdEngagement()"
                                [disabled]="rec.currentAction !== 'PENDING'"
                                class="px-4 py-2 bg-boreal-panel-elevated border border-boreal-border/40 rounded-sm hover:bg-boreal-panel-muted transition-colors text-boreal-text-secondary hover:text-boreal-text-primary disabled:opacity-30"
                                title="Hold Engagement"
                            >
                                <mat-icon class="!text-sm">pause</mat-icon>
                            </button>
                        </div>

                        <button 
                            (click)="orchestration.handoffToLab(tactical.selectedTrackId()!)"
                            class="w-full mt-3 py-2 bg-boreal-blue/5 border border-boreal-blue/20 rounded-sm text-boreal-blue text-[10px] font-bold uppercase tracking-widest hover:bg-boreal-blue/10 transition-all flex items-center justify-center gap-2"
                        >
                            <mat-icon class="!text-sm">science</mat-icon>
                            Run Sensitivity Analysis
                        </button>
                    </div>

                     <!-- Secondary Alternative (Expandable) -->
                    @if (alternativeCOA(); as alt) {
                        <div class="rounded-sm border border-boreal-border bg-boreal-canvas/40 transition-all overflow-hidden" [class.opacity-40]="!alternativeExpanded()">
                            <button 
                                (click)="alternativeExpanded.set(!alternativeExpanded())"
                                class="w-full p-4 flex items-center justify-between group text-left outline-none"
                            >
                                <div class="flex items-center gap-3">
                                    <span class="text-[9px] font-mono text-boreal-text-muted uppercase font-black tracking-widest">Alternative COA</span>
                                    @if (alternativeExpanded()) {
                                        <span class="px-1 bg-boreal-panel text-boreal-text-muted text-[7px] font-bold rounded uppercase">Detailed Tradeoff</span>
                                    }
                                </div>
                                <mat-icon class="!text-[12px] text-boreal-text-muted group-hover:text-boreal-text-primary transition-transform" [class.rotate-180]="alternativeExpanded()">
                                    expand_more
                                </mat-icon>
                            </button>
                            
                            @if (alternativeExpanded()) {
                                <div class="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <h3 class="text-[11px] font-black text-boreal-text-primary mb-1 uppercase tracking-tight">{{ alt.name }}</h3>
                                    <p class="text-[10px] text-boreal-text-secondary leading-relaxed italic mb-4">
                                        {{ alt.rationale }}
                                    </p>
                                    <div class="grid grid-cols-2 gap-4 text-[8px] border-t border-boreal-border pt-3">
                                        <div class="flex flex-col gap-0.5">
                                            <span class="text-boreal-text-muted font-bold uppercase">Confidence</span>
                                            <span class="text-boreal-green font-mono font-bold">{{ alt.projectedOutcome.confidence * 100 | number:'1.0-0' }}% P(S)</span>
                                        </div>
                                        <div class="flex flex-col gap-0.5">
                                            <span class="text-boreal-text-muted font-bold uppercase">Asymmetry</span>
                                            <span class="text-boreal-amber font-mono font-bold">Ratio 1:{{ alt.projectedOutcome.asymmetryRatio | number:'1.1-1' }}</span>
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    }

                    <!-- Strategic Engagement Controls -->
                    <div class="mt-4 pt-6 border-t border-boreal-border flex flex-col gap-3">
                        <button 
                            (click)="forceManualEngagement()"
                            [disabled]="rec.currentAction === 'MANUAL'"
                            class="w-full py-2.5 bg-boreal-red/5 text-boreal-red border border-boreal-red/20 rounded-sm text-[10px] font-black tracking-widest uppercase hover:bg-boreal-red/10 transition-all disabled:opacity-30"
                        >
                            {{ rec.currentAction === 'MANUAL' ? 'MANUAL_OVERRIDE_ACTIVE' : 'FORCE MANUAL OVERRIDE' }}
                        </button>
                        <button 
                            (click)="escalateToCommand()"
                            class="w-full py-2.5 bg-boreal-panel-elevated border border-boreal-border rounded-sm text-[10px] font-bold tracking-widest uppercase text-boreal-text-secondary hover:text-boreal-text-primary transition-colors"
                        >
                            {{ rec.currentAction === 'ESCALATED' ? 'ESCALATED_TO_HUB' : 'ESCALATE TO COMMAND' }}
                        </button>
                    </div>
                </div>
            } @else {
                <div class="h-full flex flex-col items-center justify-center p-10 text-center text-boreal-text-muted bg-boreal-canvas/10 rounded-sm border border-dashed border-boreal-border">
                    <mat-icon class="!text-4xl mb-6 !w-10 !h-10 opacity-10">radar</mat-icon>
                    <span class="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">Awaiting Track Selection</span>
                    <p class="text-[10px] mt-3 italic opacity-20 max-w-[180px] leading-relaxed">Select a track from the queue or map to view Twin-driven recommendations.</p>
                </div>
            }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .w-85 { width: 340px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TacticalConsole {
    tactical = inject(TacticalStore);
    policy = inject(PolicyStore);
    readiness = inject(ReadinessStore);
    scenario = inject(ScenarioStore);
    orchestration = inject(OrchestrationStore);
    orchestrator = inject(CapabilityOrchestrator);
    audit      = inject(AuditLogger);
    api        = inject(BdtApiService);
    layers     = inject(MapLayerStore);
    logistics  = inject(LogisticsStore);
    sensorFeed = inject(SensorFeedStore);

    mapFeatures = ENGAGEMENT_MAP_FEATURES;

    // Map Navigation & UI State
    posX = signal(0);
    posY = signal(0);
    zoomLevel = signal(1);

    alternativeExpanded = signal(false);
    _pendingConfirm = signal(false);

    isDragging = signal(false);
    lastMouseX = 0;
    lastMouseY = 0;

    // IFZ mode toggle labels shown in map controls
    readonly ifzModes = [
      { value: 'ENGAGED_ONLY' as const, label: 'Engaged' },
      { value: 'ALL_ACTIVE' as const,   label: 'All Active' },
    ];

    // Tracks to render IFZ circles for, based on current display mode
    ifzTracks = computed(() => {
      const mode   = this.layers.ifzMode();
      const tracks = this.tactical.tracks();
      if (mode === 'ENGAGED_ONLY') return tracks.filter(t => t.status === 'ENGAGED');
      return tracks.filter(t => t.status !== 'NEUTRALIZED');
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

      const onMove = (e: MouseEvent) => {
        const deltaSeconds = Math.round(-(e.clientX - this._scrubStartX) / 48 * 60);
        this.scenario.setSimTime(Math.max(0, Math.min(9000, this._scrubStartTime + deltaSeconds)));
      };

      const onUp = () => {
        this.isScrubbing.set(false);
        if (this._wasRunning) this.scenario.setRunState('RUNNING');
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
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

    alternativeCOA = computed(() => {
        const coas = this.policy.availableCOAs();
        const selectedId = this.policy.selectedCOAId();
        // Find the first non-selected COA as an "Alternative"
        return coas.find((c: COATwin) => c.id !== selectedId) || null;
    });

    // Computed Recommendation View Model
    recommendation = computed(() => {
        const track = this.tactical.selectedTrack();
        const activePolicy = this.policy.activePolicy();
        const selectedCOA = this.policy.selectedCOA();
        const engagements = this.tactical.engagements();

        if (!track || !selectedCOA) return null;

        const currentAction = engagements[track.id];

        // Find assignment for this specific track in the selected COA
        const assignment = selectedCOA.assignments.find(a => a.threatId === track.id);
        const base = assignment ? this.readiness.bases().find(b => b.id === assignment.baseId) : null;
        
        // Derive future cost (readiness delta)
        const readinessDelta = assignment && selectedCOA.projectedOutcome.readinessDeltaByBase[assignment.baseId] 
            ? selectedCOA.projectedOutcome.readinessDeltaByBase[assignment.baseId] 
            : -0.02; // Fallback

        // Dynamic rationale based on policy priority + track intent
        let focusText = 'Standard Intercept';
        if (activePolicy && activePolicy.weights.sustainability > 0.6) focusText = 'Sustainability-First Intercept';
        if (activePolicy && activePolicy.weights.safety > 0.8) focusText = 'Max-Protection Response';
        if (track.intent === 'FEINT') focusText = 'Conservation-Heavy Approach';

        const dynamicRationale = track.intent === 'STRIKE' 
            ? `High-lethality strike profile detected. ${focusText} prioritizes ${base?.name || 'Northern Vanguard'} for immediate kinetic neutralization despite ${ (Math.abs(readinessDelta) * 100).toFixed(1) }% depletion.`
            : `Track ID ${track.id} displays ${track.intent} characteristics. ${focusText} leverages ${base?.name || 'Theater Reserves'} to maintain coverage while preserving strategic effector depth.`;

        return {
            trackId: track.id,
            status: track.status,
            currentAction: (currentAction?.status || 'PENDING') as 'ACCEPTED' | 'MANUAL' | 'HELD' | 'ESCALATED' | 'PENDING',
            currentRationale: currentAction?.rationale || '',
            title: `${focusText} - ${base?.name || 'Optimal Node'}`,
            rationale: dynamicRationale,
            baseName: base?.name || 'Calculated Reserved Base',
            effectorType: assignment?.effectorType || 'Standard Kinetic',
            futureCost: (readinessDelta * 100).toFixed(1) + '%',
            asymmetry: selectedCOA.projectedOutcome.asymmetryRatio.toFixed(2),
            confidence: (selectedCOA.projectedOutcome.confidence * 100).toFixed(0),
            intentDist: [
                { label: track.intent, value: track.confidence * 100 },
                { label: 'DECOY', value: (1 - track.confidence) * 100 }
            ]
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
        // Center on selection could be implemented here as well
    }

    acceptRecommendation() {
        const rec       = this.recommendation();
        const authority = this.policy.activePolicy()?.guardrails.engagementAuthority ?? 'SEMI';
        if (!rec) return;

        if (authority === 'MANUAL') {
            // HITL: require explicit confirmation before firing
            this._pendingConfirm.set(true);
            return;
        }
        this._doAcceptRecommendation(rec);
    }

    confirmManualEngagement() {
        this._pendingConfirm.set(false);
        const rec = this.recommendation();
        if (rec) this._doAcceptRecommendation(rec);
    }

    cancelConfirm() {
        this._pendingConfirm.set(false);
    }

    private _doAcceptRecommendation(rec: NonNullable<ReturnType<TacticalConsole['recommendation']>>) {
        const authority  = this.policy.activePolicy()?.guardrails.engagementAuthority ?? 'SEMI';
        const modeLabel  = authority === 'AUTO' ? 'Auto-authorized (HNLT)' : 'Operator-authorized';
        this.tactical.updateEngagement(
            rec.trackId,
            'ACCEPTED',
            `${modeLabel}: ${rec.title}. Optimal node: ${rec.baseName}.`
        );
        const assignment = this.policy.selectedCOA()?.assignments.find(a => a.threatId === rec.trackId);
        if (assignment) {
            this.api.engageTrack(rec.trackId, assignment.baseId, assignment.effectorType).subscribe({
                next: () => this.tactical.markEngaged(rec.trackId),
                error: () => {},
            });
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

    holdEngagement() {
        const trackId = this.tactical.selectedTrackId();
        if (trackId) {
            this.tactical.updateEngagement(
                trackId, 
                'HELD', 
                'Intercept delayed for further multi-spectral intent analysis or clustering window optimization.'
            );
        }
    }

    forceManualEngagement() {
        const trackId = this.tactical.selectedTrackId();
        if (trackId) {
            this.tactical.updateEngagement(
                trackId, 
                'MANUAL', 
                'Operator enforced manual override. Bypassing AI-optimized COA and policy-weighted node selection.'
            );
        }
    }

    escalateToCommand() {
        const track = this.tactical.selectedTrack();
        const coa = this.policy.selectedCOA();
        
        if (track) {
            this.tactical.updateEngagement(
                track.id, 
                'ESCALATED', 
                'Track escalated to Air Defense Commander for strategic override. Operator reports tradeoff boundary violation.'
            );
        }

        this.orchestrator.showFeature({
            name: 'Command Escalation Flow',
            operationalFunction: `Escalates tactical track ${track?.id} to the Air Defense Commander / Orchestrator for high-level COA override or policy exception.`,
            persona: 'Tactical Operator / Stridsledare',
            decisionImproved: 'Engagement Authority & Strategic Reserve Allocation',
            inputs: `Selected Track: ${track?.id}, Assigned Base: ${coa?.assignments[0]?.baseId}, Confidence: ${track?.confidence}`,
            outputs: 'Commander Decision (Accept / Modify / Custom COA)',
            rationale: 'Certain tracks exceed tactical guardrails or present unique sustainability risks that require commander-level tradeoff balancing.',
            status: 'PARTIAL_FRONTEND',
            tier: 'MVP',
            nextStep: 'Implement Commander notification and shared track context signal.'
        });
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
            const base = this.readiness.bases().find(b => b.id === assignment.baseId);
            if (base) {
                // Return a point between threat and base as the intercept point
                return {
                    targetX: (track.geometry.x + 800) / 2, // Dummy intercept point calculation
                    targetY: (track.geometry.y + 400) / 2
                };
            }
        }
        
        // Default to a vector showing predicted track if no assignment
        return {
            targetX: track.geometry.x + Math.cos(track.geometry.heading * Math.PI / 180) * 100,
            targetY: track.geometry.y + Math.sin(track.geometry.heading * Math.PI / 180) * 100
        };
    }

    shouldShowLabel(feature: MapFeature, zoom: number): boolean {
        if (feature.subtype === 'air_base' || feature.subtype === 'capital') return true;
        if (zoom > 2) return true;
        return false;
    }
}
