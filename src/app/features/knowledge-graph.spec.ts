import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { KnowledgeGraph } from './knowledge-graph';

describe('KnowledgeGraph', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KnowledgeGraph],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('creates the expanded platform map and selects the root node by default', () => {
    const fixture = TestBed.createComponent(KnowledgeGraph);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(component.selectedNode()?.id).toBe('PLAT_001');
    expect(component.visibleNodes().length).toBeGreaterThan(10);
    expect(component.store.nodes().some(node => node.id.startsWith('REFDOC_'))).toBe(true);
    expect(component.store.nodes().some(node => node.id === 'SCAFFOLD_001')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Platform Knowledge Graph');
    expect(fixture.nativeElement.textContent).toContain('BOREAL_PLATFORM');
  });

  it('filters nodes using the search query', () => {
    const fixture = TestBed.createComponent(KnowledgeGraph);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.onSearch('counterfactual');
    fixture.detectChanges();

    expect(component.visibleNodes().some(node => node.id === 'CF_001')).toBe(true);
    expect(component.visibleNodes().some(node => node.id === 'PLAT_001')).toBe(false);
  });

  it('resets filters back to the canonical root selection', () => {
    const fixture = TestBed.createComponent(KnowledgeGraph);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.onSearch('backend');
    component.toggleCategory('CORE');
    component.clearSelection();
    fixture.detectChanges();

    component.resetFilters();
    fixture.detectChanges();

    expect(component.selectedNode()?.id).toBe('PLAT_001');
    expect(component.visibleNodes().length).toBeGreaterThan(10);
  });
});
