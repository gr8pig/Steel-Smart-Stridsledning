import { InjectionToken } from '@angular/core';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => {
    const raw = (globalThis as any).API_BASE_URL || 'http://127.0.0.1:8000';
    return raw.replace(/\/$/, '');
  }
});
