import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ShellLayoutService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private mediaQueryList: MediaQueryList | null = null;
  private readonly mediaQueryListener = () => this.syncFromViewport();

  readonly compact = signal(false);
  readonly navOpen = signal(false);
  readonly isCompact = computed(() => this.compact());

  constructor() {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    this.mediaQueryList = window.matchMedia('(max-width: 1023.98px)');
    this.syncFromViewport();

    this.mediaQueryList.addEventListener('change', this.mediaQueryListener);

    this.destroyRef.onDestroy(() => {
      if (!this.mediaQueryList) return;

      this.mediaQueryList.removeEventListener('change', this.mediaQueryListener);
    });
  }

  openNav(): void {
    if (!this.compact()) return;
    this.navOpen.set(true);
  }

  closeNav(): void {
    this.navOpen.set(false);
  }

  toggleNav(): void {
    if (!this.compact()) return;
    this.navOpen.update(value => !value);
  }

  private syncFromViewport(): void {
    const nextCompact = this.mediaQueryList?.matches ?? false;
    this.compact.set(nextCompact);
    if (!nextCompact) {
      this.navOpen.set(false);
    }
  }
}
