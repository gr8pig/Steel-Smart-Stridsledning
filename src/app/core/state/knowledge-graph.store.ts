import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import {
  PLATFORM_KNOWLEDGE_GRAPH_NODES,
} from '../models/platform-knowledge-graph.data';
import {
  KnowledgeGraphViewMode,
  NodeCategory,
  PlatformArea,
  TechNode,
} from '../models/knowledge-graph.types';

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
