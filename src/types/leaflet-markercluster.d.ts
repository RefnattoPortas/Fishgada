declare module 'leaflet.markercluster' {
  import * as L from 'leaflet'

  export interface MarkerClusterGroupOptions extends L.LayerOptions {
    chunkedLoading?: boolean
    maxClusterRadius?: number | ((zoom: number) => number)
    spiderfyOnMaxZoom?: boolean
    showCoverageOnHover?: boolean
    zoomToBoundsOnClick?: boolean
    disableClusteringAtZoom?: number
    iconCreateFunction?: (cluster: any) => L.DivIcon
  }

  export class MarkerClusterGroup extends L.LayerGroup {
    constructor(options?: MarkerClusterGroupOptions)
  }

  export default function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup
}
