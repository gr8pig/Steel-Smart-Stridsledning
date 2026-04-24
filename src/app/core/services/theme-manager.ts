import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type BorealTheme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeManager {
  private readonly STORAGE_KEY = 'boreal-theme-preference';
  private platformId = inject(PLATFORM_ID);
  
  // Default to dark mode as per Boreal identity
  theme = signal<BorealTheme>('dark');

  constructor() {
    // Initial load
    if (isPlatformBrowser(this.platformId)) {
        this.theme.set(this.loadTheme());
    }

    // Synchronize document attribute and localStorage on change
    effect(() => {
      const current = this.theme();
      if (isPlatformBrowser(this.platformId)) {
          this.applyTheme(current);
          localStorage.setItem(this.STORAGE_KEY, current);
      }
    });
  }

  toggleTheme() {
    this.theme.update(t => t === 'dark' ? 'light' : 'dark');
  }

  setTheme(newTheme: BorealTheme) {
    this.theme.set(newTheme);
  }

  private loadTheme(): BorealTheme {
    if (!isPlatformBrowser(this.platformId)) return 'dark';

    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved as BorealTheme;
    }
    
    // Check system preference if no saved preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
       // Historically, Boreal is dark-first, but we respect system if they specifically want light
       // return 'light';
    }
    
    return 'dark';
  }

  private applyTheme(theme: BorealTheme) {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    }
  }
}
