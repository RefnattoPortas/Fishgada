'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { SpotMapView } from '@/types/database'
import type { Map as LeafletMap, LatLngExpression } from 'leaflet'

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
}: FishingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<any[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const isInitializingRef = useRef(false)
  const onMapClickRef = useRef(onMapClick)

  // Atualizar ref do callback
  useEffect(() => {
    onMapClickRef.current = onMapClick
  }, [onMapClick])

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

    let mapInstance: LeafletMap | null = null

    const initMap = async () => {
      // Se já existe uma instância ou está inicializando, não faz nada
      if (leafletMapRef.current || isInitializingRef.current) return
      isInitializingRef.current = true

      try {
        const el = mapRef.current
        if (!el) return

        const L = (await import('leaflet')).default
        // @ts-expect-error - leaflet css does not have types
        await import('leaflet/dist/leaflet.css')

        // Se o elemento DOM já tem um mapa (comum no React 18 Strict Mode), 
        // ou se o Leaflet injetou classes mas a instância foi perdida
        if ((el as any)._leaflet_id) {
          // Limpeza agressiva: o Leaflet guarda a instância no elemento
          // @ts-ignore
          const existingMap = (el as any)._leaflet_id;
          if (existingMap) {
             // Tenta limpar as classes e propriedades que o Leaflet adiciona
             el.classList.remove('leaflet-container', 'leaflet-touch', 'leaflet-retina', 'leaflet-fade-anim', 'leaflet-grab', 'leaflet-touch-drag', 'leaflet-touch-zoom');
             (el as any)._leaflet_id = null;
          }
        }

        mapInstance = L.map(el, {
          center: center,
          zoom: zoom,
          zoomControl: false, // Desativado para customização
          attributionControl: false,
        })

        // Tile layer (CartoDB)
        const tileUrl = theme === 'dark'
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

        const baseLayer = L.tileLayer(tileUrl, { maxZoom: 19, subdomains: 'abcd' })
        baseLayer.addTo(mapInstance)
        
        // Guardar ref para poder mudar
        ;(mapInstance as any)._baseLayer = baseLayer

        // Atribuição personalizada discreta
        L.control.attribution({
          prefix: '© WikiFish | © CartoDB'
        }).addTo(mapInstance)

        // Evento de clique no mapa
        mapInstance.on('click', (e: any) => {
          onMapClickRef.current?.(e.latlng.lat, e.latlng.lng)
        })

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
      const newLayer = L.default.tileLayer(tileUrl, { maxZoom: 19, subdomains: 'abcd' }).addTo(map)
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

  // Renderizar pins dos spots
  useEffect(() => {
    if (!leafletMapRef.current || !isLoaded) return

    const renderMarkers = async () => {
      const L = (await import('leaflet')).default
      const map = leafletMapRef.current!

      // Limpar markers anteriores
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      // Filtrar spots
      let filteredSpots = spots
      if (filterLureType) {
        filteredSpots = spots.filter(s => s.latest_lure_type === filterLureType)
      }

      // Renderizar cada spot
      for (const spot of filteredSpots) {
        const lat = spot.display_lat ?? spot.exact_lat
        const lng = spot.display_lng ?? spot.exact_lng
        if (lat === null || lat === undefined || lng === null || lng === undefined) continue

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
          }).addTo(map)
          markersRef.current.push(circle)
        }

        // Criar ícone do pin personalizado
        const isResort = (spot as any).is_resort
        const isPartner = (spot as any).is_resort_partner
        const pinEmoji = isResort ? '🏡' : '🎣'
        const baseColor = isPartner ? '#fbbf24' : (isSelected ? privacyColor : 'var(--color-bg-card, #121e30)')
        const borderColor = isPartner ? '#fbbf24' : (isResort ? 'var(--color-accent-primary)' : privacyColor)
        
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
                  background: rgba(251, 191, 36, 0.15);
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
                box-shadow: 0 4px 20px ${isPartner ? '#fbbf2455' : privacyColor + '55'}, 
                            0 0 0 ${isSelected ? '6px' : '3px'} ${isPartner ? '#fbbf2422' : privacyColor + '22'};
                transition: all 0.2s ease;
              ">
              </div>
              <span style="
                position: absolute;
                font-size: ${isSelected ? 16 : 13}px;
                z-index: 1;
                pointer-events: none;
                filter: ${isPartner ? 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' : 'none'};
              ">${pinEmoji}</span>
              ${spot.is_verified
                ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#00d4aa;border-radius:50%;border:2px solid #0a0f1a;font-size:8px;display:flex;align-items:center;justify-content:center;">✓</div>`
                : ''}
              ${isFuzzed
                ? `<div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);font-size:8px;background:#f59e0b;color:#000;padding:1px 5px;border-radius:8px;white-space:nowrap;font-weight:700;">~${Math.round((spot.fuzz_radius_m || 0) / 1000)}km</div>`
                : ''}
              
              ${isResort && spot.resort_active_highlight
                ? `
                <div style="
                  position: absolute;
                  top: -35px;
                  background: ${isPartner ? '#fbbf24' : 'var(--color-accent-glow, #00d4aa)'};
                  color: #000;
                  padding: 4px 10px;
                  border-radius: 12px 12px 12px 0;
                  font-size: 10px;
                  font-weight: 800;
                  white-space: nowrap;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  border: 1.5px solid ${isPartner ? '#d97706' : 'var(--color-accent-primary)'};
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
          .addTo(map)
          .bindTooltip(
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

        markersRef.current.push(marker)
      }
    }

    renderMarkers()
  }, [spots, isLoaded, selectedSpotId, filterLureType, onSpotSelect])

  return (
    <div className="relative w-full h-full">
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
          className="absolute flex items-end gap-3"
          style={{ 
            bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', 
            left: 16, 
            zIndex: 900 
          }}
        >
          {/* Container Coluna: Legenda em baixo, Info acima */}
          <div className="flex flex-col gap-3">
             {/* Info de Pontos (acima da legenda) */}
             <div className="glass px-3 py-1.5 rounded-xl border border-white/5 shadow-xl w-fit">
                <span className="text-[10px] text-accent font-black uppercase tracking-wider">
                  🎣 {spots.length} pontos
                </span>
             </div>

             {/* Legenda */}
             <div className="glass p-2.5 rounded-2xl border border-white/5 shadow-2xl w-[120px]">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Legenda</p>
                <div className="flex flex-col gap-2">
                   {Object.entries(PRIVACY_COLORS).map(([key, color]) => (
                     <div key={key} className="flex items-center gap-2">
                       <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                       <span className="text-[10px] text-gray-400 font-bold uppercase">
                         {key === 'public' ? 'Público' : key === 'community' ? 'Comunitário' : 'Privado'}
                       </span>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Zoom Controls (à direita da legenda) */}
          <div className="flex flex-col gap-2">
             <button 
              onClick={() => leafletMapRef.current?.zoomIn()}
              className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all font-black text-lg border border-white/10"
             >
                +
             </button>
             <button 
              onClick={() => leafletMapRef.current?.zoomOut()}
              className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all font-black text-lg border border-white/10"
             >
                −
             </button>
          </div>
        </div>
      )}
    </div>
  )
}
