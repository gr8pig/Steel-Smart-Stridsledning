import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DecisionFabricStore } from '../core/state/decision-fabric.store';
import { TacticalStore } from '../core/state/tactical.store';
import { C2ResilienceGaugeComponent } from '../shared/ui/c2-resilience-gauge';

@Component({
  selector: 'app-c2-resilience-lab',
  standalone: true,
  imports: [CommonModule, C2ResilienceGaugeComponent],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4 text-white">C2 Resilience Lab</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Main Gauge Card -->
        <div class="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 flex flex-col items-center justify-center">
          <app-c2-resilience-gauge [score]="store.resilienceScore()"></app-c2-resilience-gauge>
        </div>

        <!-- System Status & Breakdown Card -->
        <div class="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
          <h2 class="text-lg font-semibold mb-4 text-gray-400 uppercase tracking-wider">System Status</h2>
          <div class="space-y-4">
            <div class="flex justify-between items-end">
              <div>
                <p class="text-sm text-gray-500">Resilience Index</p>
                <p class="text-3xl font-mono text-white">{{ store.resilienceScore() | number:'1.2-2' }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-500">Operational State</p>
                <p [class]="'text-xl font-bold ' + getStatusClass()">{{ store.status() }}</p>
              </div>
            </div>

            <!-- Friction Breakdown -->
            <div class="pt-4 border-t border-gray-700">
              <p class="text-xs text-gray-500 uppercase mb-2">Friction Breakdown (Weights: T:25% F:25% L:30% M:20%)</p>
              <div class="space-y-2">
                <div class="flex justify-between items-center text-xs">
                  <span class="text-gray-400">Trust Entropy</span>
                  <span class="font-mono text-white">{{ store.state().trustEntropy | percent }}</span>
                </div>
                <div class="flex justify-between items-center text-xs">
                  <span class="text-gray-400">Authority Friction</span>
                  <span class="font-mono text-white">{{ store.state().authorityFriction | percent }}</span>
                </div>
                <div class="flex justify-between items-center text-xs">
                  <span class="text-gray-400">Operator Load</span>
                  <span class="font-mono text-white">{{ store.state().operatorLoad | percent }}</span>
                </div>
                <div class="flex justify-between items-center text-xs">
                  <span class="text-gray-400">ML Failure Risk</span>
                  <span class="font-mono text-white">{{ store.state().failureProbability | percent }}</span>
                </div>
              </div>
            </div>

            <!-- Projection Info -->
            <div class="pt-4 border-t border-gray-700">
              @if (projectedCollapse(); as time) {
                <div>
                  <p class="text-sm text-red-500 animate-pulse font-bold uppercase tracking-tighter">⚠️ Critical Projection</p>
                  <p class="text-2xl font-mono text-white">Collapse in {{ time | number:'1.0-0' }}s</p>
                </div>
              } @else {
                <div>
                  <p class="text-sm text-green-500 font-bold uppercase tracking-tighter">System Stability</p>
                  <p class="text-2xl font-mono text-white">STABLE</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Collapse Horizon Timeline -->
      <div class="mt-6 bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
        <h2 class="text-lg font-semibold mb-8 text-gray-400 uppercase tracking-wider">Collapse Horizon Timeline</h2>
        
        <div class="relative h-24 mx-4 mb-4">
          <!-- Timeline Track -->
          <div class="absolute top-1/2 left-0 w-full h-1 bg-gray-700 -translate-y-1/2 rounded-full"></div>
          
          <!-- Threshold Marker (15s) -->
          <div class="absolute top-0 bottom-0 left-[2.5%] w-px bg-red-900/50 border-l border-dashed border-red-500/30">
            <span class="absolute -top-6 left-0 -translate-x-1/2 text-xs text-red-500 font-mono uppercase tracking-tighter">15s</span>
          </div>

          <!-- Projected Collapse Marker -->
          @if (projectedCollapse(); as time) {
            @if (time <= 600) {
              <div 
                class="absolute top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] z-10 transition-all duration-300"
                [style.left.%]="(time / 600) * 100"
              >
                <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-0.5 rounded font-bold whitespace-nowrap">
                  COLLAPSE: {{ time | number:'1.0-0' }}s
                </div>
              </div>
            }
          }

          <!-- Threat Markers -->
          @for (threat of threatPositions(); track threat.id) {
            <div 
              class="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-linear"
              [style.left.%]="threat.position"
            >
              <div class="flex flex-col items-center -translate-x-1/2">
                <div 
                  [class]="'w-4 h-4 rounded-full border-2 border-gray-900 shadow-lg ' + (threat.isCollapsed ? 'bg-red-500 animate-pulse' : 'bg-blue-500')"
                ></div>
                <div class="mt-2 text-xs font-mono whitespace-nowrap bg-gray-900/80 px-1 rounded" [class.text-red-400]="threat.isCollapsed" [class.text-blue-400]="!threat.isCollapsed">
                  {{ threat.id }}
                </div>
                <div class="text-xs font-mono text-gray-500">
                  {{ threat.timeToTarget }}s
                </div>
              </div>
            </div>
          }

          <!-- Time Labels -->
          <div class="absolute -bottom-4 left-0 -translate-x-1/2 text-xs text-gray-500 font-mono uppercase">0</div>
          <div class="absolute -bottom-4 left-[20%] -translate-x-1/2 text-xs text-gray-500 font-mono uppercase">2m</div>
          <div class="absolute -bottom-4 left-[40%] -translate-x-1/2 text-xs text-gray-500 font-mono uppercase">4m</div>
          <div class="absolute -bottom-4 left-[60%] -translate-x-1/2 text-xs text-gray-500 font-mono uppercase">6m</div>
          <div class="absolute -bottom-4 left-[80%] -translate-x-1/2 text-xs text-gray-500 font-mono uppercase">8m</div>
          <div class="absolute -bottom-4 left-full -translate-x-1/2 text-xs text-gray-500 font-mono uppercase">10m</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-healthy { color: #10b981; }
    .text-stressed { color: #f59e0b; }
    .text-degraded { color: #ef4444; }
  `]
})
export class C2ResilienceLabComponent {
  store = inject(DecisionFabricStore);
  tacticalStore = inject(TacticalStore);

  projectedCollapse = computed(() => this.store.collapseHorizon());

  threatPositions = computed(() => {
    const threats = this.tacticalStore.activeThreats();
    const horizon = 600; // 600 seconds
    return threats
      .filter(t => t.timeToTarget >= 0 && t.timeToTarget <= horizon)
      .map(t => ({
        id: t.id,
        timeToTarget: Math.round(t.timeToTarget),
        position: (t.timeToTarget / horizon) * 100,
        isCollapsed: t.timeToTarget < 15
      }));
  });

  getStatusClass() {
    const status = this.store.status();
    if (status === 'HEALTHY') return 'text-healthy';
    if (status === 'STRESSED') return 'text-stressed';
    return 'text-degraded';
  }
}
