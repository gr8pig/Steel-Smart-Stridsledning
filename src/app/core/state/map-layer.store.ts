import { Injectable, signal } from '@angular/core';

export type MapLayerId =
  | 'terrain'
  | 'bases'
  | 'defended_assets'
  | 'threat_tracks'
  | 'engagement_vectors'
  | 'labels'
  | 'ifz_polygons'
  | 'sensor_rings'
  | 'intent_halos'
  | 'supply_nodes'
  | 'corridors'
  | 'reinforcements'
  | 'public_capabilities'
  | 'source_badges';

export type IFZDisplayMode = 'ENGAGED_ONLY' | 'ALL_ACTIVE';

export interface MapLayer {
  id: MapLayerId;
  label: string;
  visible: boolean;
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class MapLayerStore {
  private layers = signal<MapLayer[]>([
    { id: 'threat_tracks',      label: 'Threat Tracks',       visible: true,  icon: 'radar' },
    { id: 'engagement_vectors', label: 'Engagement Vectors',  visible: true,  icon: 'trending_up' },
    { id: 'defended_assets',    label: 'Critical Assets',     visible: true,  icon: 'shield' },
    { id: 'bases',              label: 'Blue Bases',          visible: true,  icon: 'military_tech' },
    { id: 'ifz_polygons',       label: 'IFZ Polygons',        visible: true,  icon: 'radio_button_checked' },
    { id: 'sensor_rings',       label: 'Sensor Rings',        visible: true,  icon: 'wifi_tethering' },
    { id: 'intent_halos',       label: 'Intent Halos',        visible: true,  icon: 'blur_circular' },
    { id: 'terrain',            label: 'Geospatial Terrain',  visible: true,  icon: 'map' },
    { id: 'labels',             label: 'Tactical Labels',     visible: true,  icon: 'label' },
    { id: 'public_capabilities', label: 'Public Capabilities', visible: true,  icon: 'public' },
    { id: 'source_badges',       label: 'Source Attribution',  visible: true,  icon: 'fact_check' },
    { id: 'supply_nodes',       label: 'Supply Nodes',        visible: false, icon: 'local_shipping' },
    { id: 'corridors',          label: 'Supply Corridors',    visible: false, icon: 'route' },
    { id: 'reinforcements',     label: 'Reinforcements',      visible: false, icon: 'military_tech' },
  ]);

  private _ifzMode = signal<IFZDisplayMode>('ENGAGED_ONLY');

  readonly allLayers = this.layers.asReadonly();
  readonly ifzMode   = this._ifzMode.asReadonly();

  isLayerVisible(id: MapLayerId): boolean {
    return this.layers().find(l => l.id === id)?.visible ?? false;
  }

  toggleLayer(id: MapLayerId) {
    this.layers.update(ls => ls.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  }

  setLayerVisibility(id: MapLayerId, visible: boolean) {
    this.layers.update(ls => ls.map(l => l.id === id ? { ...l, visible } : l));
  }

  setIFZMode(mode: IFZDisplayMode) {
    this._ifzMode.set(mode);
  }
}
