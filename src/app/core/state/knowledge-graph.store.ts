import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import {
  PLATFORM_KNOWLEDGE_GRAPH_NODES,
} from '../models/platform-knowledge-graph.data';
import {
  KnowledgeGraphViewMode,
  NodeCategory,
  PlatformArea,
  TechNode,
} from '../models/knowledge-graph.types';
import { computed } from '@angular/core';

export interface KnowledgeGraphState {
  nodes: TechNode[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
  activeCategories: NodeCategory[];
  activeAreas: PlatformArea[];
}

const initialState: KnowledgeGraphState = {
  nodes: PLATFORM_KNOWLEDGE_GRAPH_NODES,
  selectedNodeId: 'PLAT_001',
  hoveredNodeId: null,
  searchQuery: '',
  activeCategories: [],
  activeAreas: [],
};

function toggleEntry<T extends string>(list: T[], entry: T): T[] {
  return list.includes(entry)
    ? list.filter(item => item !== entry)
    : [...list, entry];
}

export const KnowledgeGraphStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    filteredNodes: computed(() => {
      const nodes = store.nodes();
      const query = store.searchQuery().toLowerCase();
      const categories = store.activeCategories();
      const areas = store.activeAreas();

      return nodes.filter(node => {
        const matchesQuery = !query || 
          node.label.toLowerCase().includes(query) || 
          node.description.toLowerCase().includes(query);
        const matchesCategory = categories.length === 0 || categories.includes(node.category);
        const matchesArea = areas.length === 0 || (node.area && areas.includes(node.area));
        return matchesQuery && matchesCategory && matchesArea;
      });
    })
  })),
  withMethods((store) => ({
    setNodes(nodes: TechNode[]) {
      patchState(store, { nodes });
    },
    selectNode(id: string | null) {
      patchState(store, { selectedNodeId: id });
    },
    hoverNode(id: string | null) {
      patchState(store, { hoveredNodeId: id });
    },
    setSearchQuery(query: string) {
      patchState(store, { searchQuery: query });
    },
    toggleCategory(category: NodeCategory) {
      patchState(store, {
        activeCategories: toggleEntry(store.activeCategories(), category),
      });
    },
    toggleArea(area: PlatformArea) {
      patchState(store, {
        activeAreas: toggleEntry(store.activeAreas(), area),
      });
    },
    setViewMode(_mode: KnowledgeGraphViewMode) {
      // Kept for API symmetry with the scaffold-style component.
    },
    selectOnlyCategories(categories: NodeCategory[]) {
      patchState(store, { activeCategories: [...categories] });
    },
    selectOnlyAreas(areas: PlatformArea[]) {
      patchState(store, { activeAreas: [...areas] });
    },
    resetFilters() {
      patchState(store, {
        searchQuery: '',
        activeCategories: [],
        activeAreas: [],
      });
    },
  }))
);
