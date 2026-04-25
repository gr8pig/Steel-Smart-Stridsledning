import { TestBed } from '@angular/core/testing';
import { ShellLayoutService } from './shell-layout.service';

describe('ShellLayoutService', () => {
  let currentMatches = false;
  let changeListener: ((event: Event) => void) | null = null;

  beforeEach(() => {
    currentMatches = false;
    changeListener = null;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        get matches() {
          return currentMatches;
        },
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: (event: Event) => void) => {
          changeListener = listener;
        },
        removeEventListener: (_type: string, listener: (event: Event) => void) => {
          if (changeListener === listener) {
            changeListener = null;
          }
        },
        dispatchEvent: () => false,
      }),
    });

    TestBed.configureTestingModule({
      providers: [ShellLayoutService],
    });
  });

  it('tracks compact mode from the viewport and closes the drawer on desktop', () => {
    const shell = TestBed.inject(ShellLayoutService);

    expect(shell.compact()).toBe(false);
    expect(shell.isCompact()).toBe(false);
    expect(shell.navOpen()).toBe(false);

    shell.toggleNav();
    expect(shell.navOpen()).toBe(false);

    currentMatches = true;
    changeListener?.(new Event('change'));

    expect(shell.compact()).toBe(true);
    expect(shell.isCompact()).toBe(true);

    shell.openNav();
    expect(shell.navOpen()).toBe(true);

    shell.closeNav();
    expect(shell.navOpen()).toBe(false);

    shell.toggleNav();
    expect(shell.navOpen()).toBe(true);

    currentMatches = false;
    changeListener?.(new Event('change'));

    expect(shell.compact()).toBe(false);
    expect(shell.navOpen()).toBe(false);
  });
});
