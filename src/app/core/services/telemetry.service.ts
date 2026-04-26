import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private inferenceSamples = signal<number[]>([]);
  private rttSamples = signal<number[]>([]);
  
  inferenceLatency = computed(() => {
    const s = this.inferenceSamples();
    return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0;
  });

  networkRTT = computed(() => {
    const s = this.rttSamples();
    return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0;
  });

  syncStatus = signal<'CONNECTED' | 'DEGRADED' | 'DISCONNECTED'>('DISCONNECTED');

  recordInference(ms: number) {
    this.inferenceSamples.update(s => [...s.slice(-4), ms]);
  }

  recordRTT(ms: number) {
    this.rttSamples.update(s => [...s.slice(-4), ms]);
    this.syncStatus.set('CONNECTED');
  }

  setDisconnected() {
    this.syncStatus.set('DISCONNECTED');
  }
}
