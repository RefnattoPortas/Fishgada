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
}

export default function FishingMap({
  spots,
  onSpotSelect,
  selectedSpotId,
  filterSpecies,
  filterLureType,
  showHeatmap = false,
  center = [-15.7801, -47.9292], // Brasília como padrão
  zoom = 6,
}: FishingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<any[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const isInitializingRef = useRef(false)

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
          zoomControl: true,
          attributionControl: false,
        })

        // Tile layer escuro (CartoDB Dark Matter)
        L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          { maxZoom: 19, subdomains: 'abcd' }
        ).addTo(mapInstance)

        // Atribuição personalizada discreta
        L.control.attribution({
          prefix: '© WikiFish | © CartoDB'
        }).addTo(mapInstance)

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
  }, []) // Dependências vazias para inicializar apenas uma vez

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
        const lat = spot.display_lat
        const lng = spot.display_lng
        if (!lat || !lng) continue

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
        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: ${isSelected ? 40 : 32}px;
                height: ${isSelected ? 40 : 32}px;
                background: ${isSelected ? privacyColor : 'var(--color-bg-card, #121e30)'};
                border: 2.5px solid ${privacyColor};
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 4px 20px ${privacyColor}55, 0 0 0 ${isSelected ? '6px' : '3px'} ${privacyColor}22;
                transition: all 0.2s ease;
              ">
              </div>
              <span style="
                position: absolute;
                font-size: ${isSelected ? 16 : 13}px;
                z-index: 1;
                pointer-events: none;
              ">🎣</span>
              ${spot.is_verified
                ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#00d4aa;border-radius:50%;border:2px solid #0a0f1a;font-size:8px;display:flex;align-items:center;justify-content:center;">✓</div>`
                : ''}
              ${isFuzzed
                ? `<div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);font-size:8px;background:#f59e0b;color:#000;padding:1px 5px;border-radius:8px;white-space:nowrap;font-weight:700;">~${Math.round(spot.fuzz_radius_m/1000)}km</div>`
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

      {/* Legenda do mapa */}
      {isLoaded && (
        <div
          className="glass absolute"
          style={{ bottom: 24, left: 16, padding: '10px 14px', borderRadius: 12, zIndex: 900 }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Legenda
          </p>
          {Object.entries(PRIVACY_COLORS).map(([key, color]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                {key === 'public' ? 'Público' : key === 'community' ? 'Comunitário' : 'Privado'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Contagem de spots */}
      {isLoaded && (
        <div
          className="glass absolute"
          style={{ top: 16, left: 16, padding: '8px 14px', borderRadius: 10, zIndex: 900 }}
        >
          <span style={{ fontSize: 12, color: 'var(--color-accent-primary)', fontWeight: 600 }}>
            🎣 {spots.length} pontos
          </span>
        </div>
      )}
    </div>
  )
}
