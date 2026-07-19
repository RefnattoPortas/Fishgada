'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Navigation, HelpCircle } from 'lucide-react'
import type { SpotMapView } from '@/types/database'
import type { Map as LeafletMap, LatLngExpression } from 'leaflet'
import { getTile } from '@/lib/offline/indexeddb'

// Labels amigáveis para tipos de isca
const LURE_LABELS: Record<string, string> = {
  topwater: '🦟 Superfície',
  mid_water: '🐟 Meia-água',
  bottom: '⚓ Fundo',
  jig: '⚡ Jig',
  soft_plastic: '🐛 Soft Plastic',
  crankbait: '🏃 Crankbait',
  spinnerbait: '✨ Spinnerbait',
  natural_bait: '🪱 Isca Natural',
  fly: '🪰 Mosca',
  other: '🎣 Outro',
}

const PRIVACY_COLORS = {
  public:    '#00d4aa',
  community: '#f59e0b',
  private:   '#ef4444',
}

interface FishingMapProps {
  spots: SpotMapView[]
  onSpotSelect?: (spot: SpotMapView) => void
  selectedSpotId?: string | null
  filterSpecies?: string
  filterLureType?: string
  showHeatmap?: boolean
  center?: [number, number]
  zoom?: number
  onMapClick?: (lat: number, lng: number) => void
  theme?: 'dark' | 'light'
  onBoundsChange?: (bounds: { north: number, south: number, east: number, west: number }) => void
  downloadPreview?: { center: [number, number], onCenterChange: (center: [number, number]) => void }
}

const DEFAULT_CENTER: [number, number] = [-15.7801, -47.9292]
const DEFAULT_ZOOM = 6

export default function FishingMap({
  spots,
  onSpotSelect,
  selectedSpotId,
  filterSpecies,
  filterLureType,
  showHeatmap = false,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  onMapClick,
  theme = 'light',
  onBoundsChange,
  downloadPreview,
}: FishingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<any[]>([])
  const downloadPreviewRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const isInitializingRef = useRef(false)
  const onMapClickRef = useRef(onMapClick)

  // Atualizar ref do callback
  useEffect(() => {
    onMapClickRef.current = onMapClick
  }, [onMapClick])

  // Recalcular tamanho do mapa quando sidebar abre/fecha
  useEffect(() => {
    if (!leafletMapRef.current || !mapRef.current) return
    const handler = () => {
      setTimeout(() => leafletMapRef.current?.invalidateSize(), 350)
    }
    window.addEventListener('sidebarToggle', handler)
    return () => window.removeEventListener('sidebarToggle', handler)
  }, [isLoaded])

  // Obter localização do usuário
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude])
        },
        () => {}, // Silenciar erro se negado
        { timeout: 5000 }
      )
    }
  }, [])

  // Inicializar mapa Leaflet (dinâmico para evitar SSR error)
  useEffect(() => {
    if (!mapRef.current) return

    let mounted = true
    let timeoutId: NodeJS.Timeout | null = null
    let mapInstance: LeafletMap | null = null

    const initMap = async () => {
      if (!mounted || leafletMapRef.current) return
      isInitializingRef.current = true

      try {
        const el = mapRef.current
        if (!el || !mounted) return

        const L = (await import('leaflet')).default
        if (!mounted) return
        
        // @ts-expect-error - leaflet css does not have types
        await import('leaflet/dist/leaflet.css')
        if (!mounted) return

        // Limpeza de mapa residual se houver
        if ((el as any)._leaflet_id) {
          el.classList.remove('leaflet-container', 'leaflet-touch', 'leaflet-retina', 'leaflet-fade-anim', 'leaflet-grab', 'leaflet-touch-drag', 'leaflet-touch-zoom');
          (el as any)._leaflet_id = null;
        }

        mapInstance = L.map(el, {
          center: center,
          zoom: zoom,
          zoomControl: false,
          attributionControl: false,
        })

        const tileUrl = theme === 'dark'
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

        // Camada que suporta offline
        const OfflineLayer = L.TileLayer.extend({
          createTile: function(coords: any, done: any) {
            const tile = document.createElement('img')
            tile.setAttribute('role', 'presentation')

            // Captura os valores SINCRONAMENTE antes de qualquer async
            if (!coords || typeof coords.z !== 'number' || isNaN(coords.z) || isNaN(coords.x) || isNaN(coords.y)) {
              return tile
            }

            const id = `${theme}/${coords.z}/${coords.x}/${coords.y}`
            // Gera a URL online agora (síncrono), antes do gap async
            let onlineUrl = ''
            try {
              onlineUrl = this.getTileUrl(coords)
            } catch (_) {
              return tile
            }
            if (!onlineUrl || onlineUrl.includes('NaN')) return tile
            
            getTile(id).then(cached => {
              if (cached && cached.blob) {
                const url = URL.createObjectURL(cached.blob)
                tile.src = url
                tile.onload = () => { this._tileOnLoad(done, tile) }
                tile.onerror = () => { tile.src = onlineUrl }
              } else {
                tile.src = onlineUrl
                L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile))
                L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile))
              }
            }).catch(() => {
              tile.src = onlineUrl
              L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile))
              L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile))
            })
            
            return tile
          }
        })

        const baseLayer = new (OfflineLayer as any)(tileUrl, { maxZoom: 19, subdomains: 'abcd' })
        baseLayer.addTo(mapInstance)
        ;(mapInstance as any)._baseLayer = baseLayer

        L.control.attribution({ prefix: '© Fishgada | © CartoDB' }).addTo(mapInstance)

        mapInstance.on('click', (e: any) => {
          onMapClickRef.current?.(e.latlng.lat, e.latlng.lng)
        })

        const emitBounds = () => {
          if (!mounted || !mapInstance || !el.isConnected) return
          try {
            const b = mapInstance.getBounds()
            if (b && onBoundsChange) {
              onBoundsChange({
                north: b.getNorth(),
                south: b.getSouth(),
                east: b.getEast(),
                west: b.getWest()
              })
            }
          } catch (e) {
            console.warn('Leaflet: getBounds failed safely.', e)
          }
        }

        mapInstance.on('moveend', emitBounds)
        mapInstance.on('zoomend', emitBounds)
        timeoutId = setTimeout(() => {
          mapInstance?.invalidateSize()
          emitBounds()
        }, 500)

        leafletMapRef.current = mapInstance
        setIsLoaded(true)
      } catch (error) {
        console.error('Erro ao inicializar o mapa:', error)
      } finally {
        isInitializingRef.current = false
      }
    }

    initMap()

    return () => {
      mounted = false
      isInitializingRef.current = false
      if (timeoutId) clearTimeout(timeoutId)
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      } else if (mapInstance) {
        mapInstance.remove()
      }
      setIsLoaded(false)
    }
  }, [center, zoom]) // Se mudar centro/zoom recria o mapa

  // Quando mudar o tema, recarregar o mapa ou trocar apenas a camada (melhor desempenho é mudar o URL do tileLayer se L.tileLayer tem setUrl, senao remove a grid_layer e add de novo)
  useEffect(() => {
    if (!isLoaded || !leafletMapRef.current) return
    const map = leafletMapRef.current
    const tileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      
    const oldLayer = (map as any)._baseLayer
    if (oldLayer) map.removeLayer(oldLayer)

    import('leaflet').then(L => {
      // Re-implementar a camada offline ao trocar o tema
      const OfflineLayer = L.default.TileLayer.extend({
        createTile: function(coords: any, done: any) {
          const tile = document.createElement('img')
          tile.setAttribute('role', 'presentation')

          if (!coords || typeof coords.z !== 'number' || isNaN(coords.z) || isNaN(coords.x) || isNaN(coords.y)) {
            return tile
          }

          const id = `${theme}/${coords.z}/${coords.x}/${coords.y}`
          let onlineUrl = ''
          try {
            onlineUrl = this.getTileUrl(coords)
          } catch (_) {
            return tile
          }
          if (!onlineUrl || onlineUrl.includes('NaN')) return tile
          
          getTile(id).then(cached => {
            if (cached && cached.blob) {
              const url = URL.createObjectURL(cached.blob)
              tile.src = url
              tile.onload = () => { this._tileOnLoad(done, tile) }
              tile.onerror = () => { tile.src = onlineUrl }
            } else {
              tile.src = onlineUrl
              L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile))
              L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile))
            }
          }).catch(() => {
            tile.src = onlineUrl
            L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile))
            L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile))
          })
          
          return tile
        }
      })

      const newLayer = new (OfflineLayer as any)(tileUrl, { maxZoom: 19, subdomains: 'abcd' })
      
      const originalGetTileUrl = newLayer.getTileUrl
      newLayer.getTileUrl = function(coords: any) {
        if (!coords || isNaN(coords.z)) return ''
        return originalGetTileUrl.call(this, coords)
      }
      
      newLayer.addTo(map)
      ;(map as any)._baseLayer = newLayer
    })

  }, [theme, isLoaded])

  // Atualizar posição do usuário no mapa
  useEffect(() => {
    if (!leafletMapRef.current || !userLocation || !isLoaded) return

    const initUserMarker = async () => {
      const L = (await import('leaflet')).default
      const map = leafletMapRef.current!

      // Ícone de localização do usuário
      const userIcon = L.divIcon({
        className: '',
        html: `
          <div style="
            width: 20px; height: 20px;
            background: #0ea5e9;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 4px rgba(14,165,233,0.3),
                        0 0 20px rgba(14,165,233,0.5);
            animation: pulse 2s infinite;
          "></div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.8; }
            }
          </style>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      L.marker(userLocation as LatLngExpression, { icon: userIcon })
        .addTo(map)
        .bindTooltip('Você está aqui', { permanent: false })

      // Centralizar no usuário
      map.setView(userLocation as LatLngExpression, 12, { animate: true })
    }

    initUserMarker()
  }, [userLocation, isLoaded])

  // Renderizar pins dos spots com clustering
  useEffect(() => {
    if (!leafletMapRef.current || !isLoaded) return

    const renderMarkers = async () => {
      const L = (await import('leaflet')).default
      let MarkerClusterGroup: any
      try {
        const mod = await import('leaflet.markercluster')
        MarkerClusterGroup = mod.MarkerClusterGroup || mod.default || mod
      } catch {
        MarkerClusterGroup = null
      }
      const map = leafletMapRef.current!

      // Limpar markers anteriores
      markersRef.current.forEach(m => {
        if (m.remove) m.remove()
      })
      markersRef.current = []

      // Criar cluster group se disponível
      let clusterGroup: any = null
      if (MarkerClusterGroup) {
        clusterGroup = new MarkerClusterGroup({
          chunkedLoading: true,
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          disableClusteringAtZoom: 15,
          iconCreateFunction: (cluster: any) => {
            const count = cluster.getChildCount()
            const hasPartner = cluster.getAllChildMarkers().some((m: any) => m.options?.isPartner)
            const color = hasPartner ? '#a855f7' : '#00d4aa'
            return L.divIcon({
              className: '',
              html: `
                <div style="
                  width: 44px; height: 44px;
                  background: ${color}22;
                  border: 2.5px solid ${color};
                  border-radius: 50%;
                  display: flex; align-items: center; justify-content: center;
                  box-shadow: 0 0 20px ${color}44;
                  font-weight: 900; font-size: 12px; color: white;
                  font-family: Inter, sans-serif;
                ">
                  ${count}
                  ${hasPartner ? '<span style="position:absolute;top:-2px;right:-2px;font-size:8px;">👑</span>' : ''}
                </div>
              `,
              iconSize: [44, 44],
              iconAnchor: [22, 22],
            })
          },
        })
        map.addLayer(clusterGroup)
      }

      // Filtrar spots
      let filteredSpots = [...spots]
      if (filterLureType) {
        filteredSpots = spots.filter(s => s.latest_lure_type === filterLureType)
      }

      // Ordena para que Pesqueiros (is_resort) e Parceiros (is_resort_partner) fiquem no topo
      filteredSpots.sort((a, b) => {
        const scoreA = ((a as any).is_resort ? 1 : 0) + ((a as any).is_resort_partner ? 2 : 0)
        const scoreB = ((b as any).is_resort ? 1 : 0) + ((b as any).is_resort_partner ? 2 : 0)
        return scoreA - scoreB
      })

      // Renderizar cada spot
      const usedCoords = new Set<string>()

      for (const spot of filteredSpots) {
        let lat = spot.display_lat ?? spot.exact_lat
        let lng = spot.display_lng ?? spot.exact_lng
        if (lat === null || lat === undefined || lng === null || lng === undefined) continue

        // Gerenciar sobreposição (jitter)
        const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`
        if (usedCoords.has(coordKey)) {
          lat += (Math.random() - 0.5) * 0.0001
          lng += (Math.random() - 0.5) * 0.0001
        }
        usedCoords.add(coordKey)

        const isSelected = spot.id === selectedSpotId
        const privacyColor = PRIVACY_COLORS[spot.privacy_level as keyof typeof PRIVACY_COLORS] || '#00d4aa'
        const isFuzzed = spot.privacy_level === 'community' && spot.fuzz_radius_m > 0

        // Se for spot comunitário com fuzzing, mostrar círculo de incerteza
        if (isFuzzed && !isSelected) {
          const circle = L.circle([lat, lng] as LatLngExpression, {
            color: PRIVACY_COLORS.community,
            fillColor: PRIVACY_COLORS.community,
            fillOpacity: 0.08,
            weight: 1,
            opacity: 0.4,
            radius: spot.fuzz_radius_m,
          })
          if (clusterGroup) {
            clusterGroup.addLayer(circle)
          } else {
            map.addLayer(circle)
          }
          markersRef.current.push(circle)
        }

        // Criar ícone do pin personalizado
        const isResort = (spot as any).is_resort
        const isPartner = (spot as any).is_resort_partner
        const resortInfra = (spot as any).resort_infrastructure || {}
        const hasRestaurant = resortInfra.restaurante === true
        const pinEmoji = isPartner
          ? (hasRestaurant ? '🍽️🎣' : '🏡')
          : '🎣'
        const baseColor = isPartner ? '#000000' : (isSelected ? privacyColor : 'var(--color-bg-card, #121e30)')
        const borderColor = isPartner ? '#a855f7' : privacyColor

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${isPartner ? `
                <div style="
                  position: absolute;
                  width: 50px; height: 50px;
                  background: rgba(168, 85, 247, 0.2);
                  border-radius: 50%;
                  animation: partner-pulse 2s infinite;
                  z-index: -1;
                "></div>
                <style>
                  @keyframes partner-pulse {
                    0% { transform: scale(0.8); opacity: 0.8; }
                    100% { transform: scale(1.6); opacity: 0; }
                  }
                </style>
              ` : ''}
              <div style="
                width: ${isSelected ? 40 : 32}px;
                height: ${isSelected ? 40 : 32}px;
                background: ${baseColor};
                border: 2.5px solid ${borderColor};
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 4px 20px ${isPartner ? '#a855f755' : privacyColor + '55'}, 
                            0 0 0 ${isSelected ? '6px' : '3px'} ${isPartner ? '#a855f722' : privacyColor + '22'};
                transition: all 0.2s ease;
                role: img;
                aria-label: Marcador de ${spot.title};
              ">
              </div>
              <span style="
                position: absolute;
                font-size: ${isSelected ? (hasRestaurant ? 12 : 16) : (hasRestaurant ? 10 : 13)}px;
                z-index: 1;
                pointer-events: none;
                white-space: nowrap;
                filter: ${isPartner ? 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' : 'none'};
              ">${pinEmoji}</span>
              ${spot.is_verified
                ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#00d4aa;border-radius:50%;border:2px solid #0a0f1a;font-size:8px;display:flex;align-items:center;justify-content:center;" aria-label="Verificado">✓</div>`
                : ''}
              ${isFuzzed
                ? `<div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);font-size:8px;background:#f59e0b;color:#000;padding:1px 5px;border-radius:8px;white-space:nowrap;font-weight:700;">~${Math.round((spot.fuzz_radius_m || 0) / 1000)}km</div>`
                : ''}

              ${isResort && spot.resort_active_highlight
                ? `
                <div style="
                  position: absolute;
                  top: -35px;
                  background: ${isPartner ? '#a855f7' : 'var(--color-accent-glow, #00d4aa)'};
                  color: #fff;
                  padding: 4px 10px;
                  border-radius: 12px 12px 12px 0;
                  font-size: 10px;
                  font-weight: 800;
                  white-space: nowrap;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  border: 1.5px solid ${isPartner ? '#7e22ce' : 'var(--color-accent-primary)'};
                  animation: bounce 2s infinite;
                ">
                  ${isPartner ? '👑' : '🐟'} ${spot.resort_active_highlight}
                </div>
                <style>
                  @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                  }
                </style>
                `
                : ''}
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [15, 35],
          popupAnchor: [5, -35],
        })

        const marker = L.marker([lat, lng] as LatLngExpression, { icon })
        ;(marker as any).options.isPartner = isPartner

        marker.bindTooltip(
          `<div style="font-family:Inter,sans-serif;font-size:13px;">
            <strong>${spot.title}</strong>
            ${spot.total_captures ? `<br/><span style="color:#00d4aa">🎣 ${spot.total_captures} capturas</span>` : ''}
            ${spot.latest_lure_type ? `<br/>${LURE_LABELS[spot.latest_lure_type] || spot.latest_lure_type}` : ''}
          </div>`,
          { className: 'custom-tooltip', direction: 'top' }
        )

        marker.on('click', () => {
          onSpotSelect?.(spot)
        })

        if (clusterGroup) {
          clusterGroup.addLayer(marker)
        } else {
          map.addLayer(marker)
        }
        markersRef.current.push(marker)
      }
    }

    renderMarkers()

    return () => {
      const map = leafletMapRef.current
      if (map && (map as any)._layers) {
        markersRef.current.forEach(m => {
          if (m.remove) m.remove()
        })
        markersRef.current = []
      }
    }
  }, [spots, isLoaded, selectedSpotId, filterLureType, onSpotSelect])

  // Gerenciar camada de preview do download (Círculo de 50km)
  useEffect(() => {
    if (!leafletMapRef.current || !isLoaded) return
    const map = leafletMapRef.current

    // Limpeza anterior
    if (downloadPreviewRef.current) {
       downloadPreviewRef.current.marker.remove()
       downloadPreviewRef.current.circle.remove()
       downloadPreviewRef.current = null
    }

    if (!downloadPreview) return

    import('leaflet').then(L => {
      const center = downloadPreview.center
      
      const marker = L.default.marker(center as LatLngExpression, { 
        draggable: true,
        zIndexOffset: 1000,
        icon: L.default.divIcon({
          className: '',
          html: `
            <div style="
              width: 44px; height: 44px; 
              background: #00d4aa; 
              border: 4px solid white; 
              border-radius: 50%; 
              display: flex; align-items: center; justify-center; 
              box-shadow: 0 0 30px rgba(0,212,170,0.6);
            ">
               <div style="margin: auto;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
               </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        })
      }).addTo(map)

      const circle = L.default.circle(center as LatLngExpression, {
        radius: 50000, // 50km
        color: '#00d4aa',
        fillColor: '#00d4aa',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '10, 10',
        interactive: false
      }).addTo(map)

      marker.on('drag', (e) => {
        circle.setLatLng(e.target.getLatLng())
      })

      marker.on('dragend', (e) => {
        const newPos = e.target.getLatLng()
        downloadPreview.onCenterChange([newPos.lat, newPos.lng])
      })

      downloadPreviewRef.current = { marker, circle }
    })

    return () => {
      if (downloadPreviewRef.current) {
        downloadPreviewRef.current.marker.remove()
        downloadPreviewRef.current.circle.remove()
        downloadPreviewRef.current = null
      }
    }
  }, [downloadPreview, isLoaded])

  const handleFindMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          if (leafletMapRef.current) {
            leafletMapRef.current.flyTo([lat, lng], 15)
          }
        },
        () => alert('Não foi possível obter sua localização. Por favor, verifique as permissões de GPS.'),
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }

  return (
    <div className="relative w-full h-full" style={{ isolation: 'isolate' }}>
      {/* Mapa */}
      <div ref={mapRef} className="w-full h-full" id="fishing-map" />

      {/* Overlay de carregamento */}
      {!isLoaded && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{ background: 'var(--color-bg-primary)', zIndex: 1000 }}
        >
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Carregando mapa...
          </p>
        </div>
      )}

      {/* Legenda e Zoom Customizado */}
      {isLoaded && (
        <div
          className="absolute flex items-end gap-1.5"
          style={{
            bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            left: 16,
            zIndex: 900
          }}
        >
          {/* Container Coluna: Legenda em baixo, Info acima */}
          <div className="flex flex-col gap-3">
             {/* Legenda */}
             <div className="glass p-2.5 rounded-2xl border border-white/5 shadow-2xl w-[120px] relative group-help-legend">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Legenda</p>
                  <div className="relative">
                    <HelpCircle size={14} className="text-cyan-400 cursor-help transition-transform hover:scale-110" />
                    {/* Popover Legenda */}
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-4 glass-elevated border border-cyan-500/30 rounded-2xl shadow-2xl hidden group-help-legend:hover:block group-help-legend:active:block backdrop-blur-xl bg-[#0f172a]/95">
                      <div className="space-y-3">
                        <p className="text-[10px] leading-relaxed text-white">
                          <span className="text-[#10b981] font-black uppercase">🟢 Público:</span> Áreas de livre acesso (Rios, Represas abertas). Sem custo ou restrição de entrada.
                        </p>
                        <p className="text-[10px] leading-relaxed text-white">
                          <span className="text-[#f59e0b] font-black uppercase">🟠 Comunitário:</span> Locais geridos por grupos locais ou condomínios. Acesso colaborativo.
                        </p>
                        <p className="text-[10px] leading-relaxed text-white">
                          <span className="text-[#ef4444] font-black uppercase">🔴 Privado:</span> Propriedades particulares. Exige autorização prévia do proprietário.
                        </p>
                        <p className="text-[10px] leading-relaxed text-white border-t border-white/5 pt-2">
                          <span className="text-[#a855f7] font-black uppercase">🟣 Parceiro:</span> Pesqueiro comercial. Possui estrutura e é destaque no Fishgada.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                   {Object.entries(PRIVACY_COLORS).map(([key, color]) => (
                     <div key={key} className="flex items-center gap-2">
                       <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                       <span className="text-[10px] text-gray-400 font-bold uppercase">
                         {key === 'public' ? 'Público' : key === 'community' ? 'Comunitário' : 'Privado'}
                       </span>
                     </div>
                   ))}
                   
                   {/* Destaque para Parceiros */}
                   <div className="flex items-center gap-2 mt-1 border-t border-white/5 pt-2">
                      <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_#a855f7]" style={{ background: '#a855f7' }} />
                      <span className="text-[10px] text-purple-400 font-black uppercase">Parceiro</span>
                   </div>
                </div>
             </div>
          </div>
 
           {/* Download Preview Overlay */}
           {downloadPreview && (
             <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-[#00d4aa] text-[#0a0f1a] px-5 py-2.5 rounded-full shadow-[0_0_40px_rgba(0,212,170,0.4)] flex items-center gap-3 border-2 border-white">
                  <div className="w-2 h-2 bg-[#0a0f1a] rounded-full animate-ping" />
                  <p className="text-xs font-black uppercase tracking-widest italic leading-none">
                    Arraste o marcador para selecionar a área de 50km
                  </p>
                </div>
             </div>
           )}

          {/* Zoom Controls (à direita da legenda) */}
           <div className="flex flex-col gap-2" role="group" aria-label="Controles do mapa">
              <button
               onClick={handleFindMe}
               className="w-10 h-10 glass rounded-xl flex items-center justify-center text-accent hover:bg-white/10 transition-all border border-accent/30 shadow-[0_0_15px_rgba(0,183,168,0.2)]"
               title="Encontrar minha localização"
               aria-label="Minha localização — centralizar mapa na sua posição atual"
              >
                 <Navigation size={18} fill="currentColor" />
              </button>
              <button
               onClick={() => leafletMapRef.current?.zoomIn()}
               className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all font-black text-lg border border-white/10"
               title="Aumentar zoom"
               aria-label="Aumentar zoom do mapa"
              >
                 +
              </button>
              <button
               onClick={() => leafletMapRef.current?.zoomOut()}
               className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all font-black text-lg border border-white/10"
               title="Diminuir zoom"
               aria-label="Diminuir zoom do mapa"
              >
                 −
              </button>
           </div>
        </div>
      )}
    </div>
  )
}
