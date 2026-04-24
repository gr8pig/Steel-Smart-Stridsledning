import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-c2-resilience-gauge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center">
      <svg width="200" height="120" viewBox="0 0 200 120">
        <!-- Background Track -->
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#374151" stroke-width="12" stroke-linecap="round"/>
        <!-- Active Gauge -->
        <path [attr.d]="gaugePath()" fill="none" [attr.stroke]="gaugeColor()" stroke-width="12" stroke-linecap="round" style="transition: stroke-dasharray 0.5s ease-out;"/>
        
        <text x="100" y="90" text-anchor="middle" class="text-3xl font-bold fill-white">
          {{ (score() * 100) | number:'1.0-0' }}%
        </text>
      </svg>
      <div class="text-xs uppercase tracking-widest text-gray-500 mt-2 opacity-70">
        C2 Resilience Score
      </div>
      <div class="text-[10px] italic text-rose-400/60 mt-1">
        Heuristic Prototype Metric
      </div>
    </div>
  `
})
export class C2ResilienceGaugeComponent {
  score = input.required<number>();

  gaugeColor = computed(() => {
    const s = this.score();
    if (s > 0.7) return '#10b981'; // Emerald
    if (s > 0.4) return '#f59e0b'; // Amber
    return '#f43f5e'; // Rose
  });

  gaugePath = computed(() => {
    const s = Math.max(0, Math.min(1, this.score()));
    const radius = 80;
    const centerX = 100;
    const centerY = 100;
    const angle = s * Math.PI; // 0 to 180 degrees in radians
    
    const x = centerX - radius * Math.cos(angle);
    const y = centerY - radius * Math.sin(angle);
    
    return `M 20 100 A 80 80 0 0 1 ${x} ${y}`;
  });
}
