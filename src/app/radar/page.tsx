'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import SpotDetailsView from '@/components/map/SpotDetailsView'
import MapFiltersBar, { MapFilters } from '@/components/map/MapFiltersBar'
import type { SpotMapView } from '@/types/database'
import { Plus, RefreshCw, MapPin, Warehouse, Flame, Download, Info, Fish, Store } from 'lucide-react'
import type { ResortHighlight } from '@/components/map/MapFiltersBar'
import PaywallModal from '@/components/common/PaywallModal'
import WelcomeOverlay from '@/components/common/WelcomeOverlay'
import LandingPage from '@/components/landing/LandingPage'

// Importação dinâmica do mapa (evita erro de SSR com Leaflet)
const FishingMap = dynamic(
  () => import('@/components/map/FishingMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full"
        style={{ background: 'var(--color-bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 48, height: 48, borderWidth: 3, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Carregando mapa...</p>
        </div>
      </div>
    ),
  }
)

// Importação dinâmica dos formulários
const NewCaptureForm = dynamic(() => import('@/components/captures/NewCaptureForm'), { ssr: false })
const NewSpotForm = dynamic(() => import('@/components/map/NewSpotForm'), { ssr: false })
const NewResortForm = dynamic(() => import('@/components/map/NewResortForm'), { ssr: false })

// Spots de exemplo (em produção viriam do Supabase)
const DEMO_SPOTS: SpotMapView[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001', user_id: '00000000-0000-0000-0000-000000000001', title: 'Rio Araguaia — Tucunaré Point',
    description: 'Ponto famoso para tucunaré. Melhor na época da piracema com isca de superfície.',
    privacy_level: 'public', fuzz_radius_m: 0, water_type: 'river',
    is_verified: true, verification_count: 7, community_unlock_captures: 0,
    created_at: '2025-06-01T10:00:00Z',
    display_lat: -13.4, display_lng: -50.7, exact_lat: -13.4, exact_lng: -50.7,
    total_captures: 23, latest_lure_type: 'topwater', latest_lure_model: 'Rapala X-Rap',
    latest_lure_color: 'Chartreuse', photo_url: null, owner_name: 'João Pescador', owner_avatar: null,
    resort_id: null, is_resort: false, opening_hours: null, phone: null, instagram: null, 
    website: null, resort_infrastructure: null, resort_prices: null, is_resort_partner: false, 
    resort_main_species: null, resort_active_highlight: null, resort_notice_board: null,
    open_tournaments_count: 0, searchable_species: null
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002', user_id: '00000000-0000-0000-0000-000000000002', title: 'Lago Corumbá — Dourado Bom',
    description: 'Represa com muito dourado. Precisa de barco para chegar.',
    privacy_level: 'community', fuzz_radius_m: 800, water_type: 'reservoir',
    is_verified: false, verification_count: 2, community_unlock_captures: 5,
    created_at: '2025-08-15T08:00:00Z',
    display_lat: -16.2, display_lng: -48.9, exact_lat: -16.189, exact_lng: -48.877,
    total_captures: 11, latest_lure_type: 'jig', latest_lure_model: 'Fish Head Jig 1/2oz',
    latest_lure_color: 'Laranja', photo_url: null, owner_name: 'Maria Silva', owner_avatar: null,
    resort_id: null, is_resort: false, opening_hours: null, phone: null, instagram: null, 
    website: null, resort_infrastructure: null, resort_prices: null, is_resort_partner: false, 
    resort_main_species: null, resort_active_highlight: null, resort_notice_board: null,
    open_tournaments_count: 0, searchable_species: null
  },
]

// Fallback para quando o usuário não está logado
const GUEST_USER_ID = 'guest-user'

function HomeContent() {
  const [spots, setSpots] = useState<SpotMapView[]>([])
  const [selectedSpot, setSelectedSpot] = useState<SpotMapView | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showCaptureForm, setShowCaptureForm] = useState(false)
  const [showSpotForm, setShowSpotForm] = useState(false)
  const [showResortForm, setShowResortForm] = useState(false)
  const [activeSpotId, setActiveSpotId] = useState<string | null>(null)
  const [creationMode, setCreationMode] = useState<'spot' | 'resort' | null>(null)
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSync, setPendingSync] = useState(0)
  const [isLoadingSpots, setIsLoadingSpots] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallFeature, setPaywallFeature] = useState('')
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('light')
  const [mapBounds, setMapBounds] = useState<{ north: number, south: number, east: number, west: number } | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)

  // Ler tema local do mapa
  useEffect(() => {
    const saved = localStorage.getItem('fishgada_map_theme') as 'dark' | 'light'
    if (saved) setMapTheme(saved)
  }, [])

  // Monitorar auth
  useEffect(() => {
    const checkUser = async () => {
      const { getSupabaseClient } = await import('@/lib/supabase/client')
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setUser({ ...user, profile: profile as any })
        if ((profile as any)?.is_first_login) setShowWelcome(true)
      } else {
        setUser(null)
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setUser({ ...session.user, profile: profile as any })
          if ((profile as any)?.is_first_login) setShowWelcome(true)
        } else {
          setUser(null)
        }
      })

      return () => subscription.unsubscribe()
    }
    checkUser()
  }, [])

  const searchParams = useSearchParams()

  const handleSpotSelect = useCallback((spot: SpotMapView) => {
    setSelectedSpot(spot)
    setActiveSpotId(spot.id)
    setDrawerOpen(true)
  }, [])

  // Lógica para selecionar spot via URL (ex: de um card de torneio)
  useEffect(() => {
    const spotId = searchParams.get('selectSpot')
    if (spotId && spots.length > 0) {
      const targetSpot = spots.find(s => s.id === spotId)
      if (targetSpot) {
        handleSpotSelect(targetSpot)
      }
    }
  }, [searchParams, spots, handleSpotSelect])

  const userId = user?.id || GUEST_USER_ID

  const [filters, setFilters] = useState<MapFilters>({
    species: '',
    lureType: '',
    waterType: '',
    showOnlyVerified: false,
    showOnlyPublic: false,
    showOnlyResorts: false,
    hidePublic: false,
  })

  const filteredSpots = useMemo(() => {
    let result = spots
    if (filters.species) {
      let sp = filters.species.toLowerCase()
      // Remove o nome científico
      if (sp.includes('(')) sp = sp.split('(')[0].trim()
      
      // Divide por '/' para casos como 'Pintado/Surubim'
      const searchTerms = sp.split('/').map(t => t.trim())
      
      result = result.filter(s => {
        const target = (
          s.title + ' ' + 
          ((s as any).searchable_species || '') + ' ' + 
          ((s as any).resort_main_species || '')
        ).toLowerCase()
        
        return searchTerms.some(term => target.includes(term))
      })
    }
    if (filters.lureType) {
      result = result.filter(s => s.latest_lure_type === filters.lureType)
    }
    if (filters.waterType) {
      result = result.filter(s => s.water_type === filters.waterType)
    }
    if (filters.showOnlyVerified) {
      result = result.filter(s => s.is_verified)
    }
    if (filters.showOnlyPublic) {
      result = result.filter(s => s.privacy_level === 'public')
    }
    if (filters.showOnlyResorts) {
      result = result.filter(s => s.is_resort)
    }
    if (filters.hidePublic) {
      result = result.filter(s => s.privacy_level !== 'public')
    }
    return result
  }, [spots, filters])

  const fetchSpots = useCallback(async () => {
    setIsLoadingSpots(true)
    try {
      const { getSupabaseClient } = await import('@/lib/supabase/client')
      const supabase = getSupabaseClient()
      
      const { data, error } = await supabase
        .from('spots_map_view')
        .select('*')
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setSpots(data as SpotMapView[])
      } else {
        setSpots(DEMO_SPOTS)
      }
    } catch (err: any) {
      console.error('Erro ao buscar spots:', err.message || err.details || err)
      setSpots(DEMO_SPOTS)
    } finally {
      setIsLoadingSpots(false)
    }
  }, [])

  // Buscar spots do Supabase inicial
  useEffect(() => {
    fetchSpots()
  }, [fetchSpots])

  // Monitorar status de conexão
  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    updateOnline()
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  // Verificar itens pendentes no IndexedDB
  useEffect(() => {
    const checkPending = async () => {
      try {
        const { getPendingCount } = await import('@/lib/offline/indexeddb')
        const count = await getPendingCount()
        setPendingSync(count)
      } catch {}
    }
    checkPending()
    const interval = setInterval(checkPending, 10000)
    return () => clearInterval(interval)
  }, [])

  // Auto-sync quando voltar online
  useEffect(() => {
    if (!isOnline || pendingSync === 0 || !user) return
    
    let isSubscribed = true
    const doSync = async () => {
      try {
        const { syncPendingData, getPendingCount } = await import('@/lib/offline/indexeddb')
        const { getSupabaseClient } = await import('@/lib/supabase/client')
        const supabase = getSupabaseClient()
        
        console.log('[Sync] Iniciando sincronização em segundo plano...')
        const result = await syncPendingData(supabase, user.id)
        
        if (!isSubscribed) return

        if (result.synced > 0) {
          console.log(`[Sync] ${result.synced} item(ns) sincronizado(s). Atualizando pins.`)
          fetchSpots()
        }

        const newCount = await getPendingCount()
        if (newCount !== pendingSync) {
          setPendingSync(newCount)
        }
      } catch (err) {
        console.error('[Sync] Erro crítico no auto-sync:', err)
      }
    }
    
    doSync()
    return () => { isSubscribed = false }
  }, [isOnline, pendingSync, user, fetchSpots])

  const handleNewCapture = useCallback((spotId: string) => {
    setActiveSpotId(spotId)
    setShowCaptureForm(true)
  }, [])

  // Highlights de pesqueiros filtrados pela viewport atual do mapa
  const viewportHighlights = useMemo<ResortHighlight[]>(() => {
    if (!mapBounds) return []
    return filteredSpots
      .filter(s => {
        if (!s.is_resort || !s.resort_active_highlight) return false
        const lat = s.display_lat ?? s.exact_lat
        const lng = s.display_lng ?? s.exact_lng
        if (lat == null || lng == null) return false
        // Só mostra se estiver dentro da viewport visível
        return lat >= mapBounds.south && lat <= mapBounds.north && lng >= mapBounds.west && lng <= mapBounds.east
      })
      .map(s => ({ id: s.id, title: s.title, highlight: s.resort_active_highlight! }))
  }, [filteredSpots, mapBounds])

  const handleHighlightClick = useCallback((id: string) => {
    const spot = filteredSpots.find(s => s.id === id)
    if (spot) handleSpotSelect(spot)
  }, [filteredSpots, handleSpotSelect])

  // Contagem de pontos visíveis na viewport
  const viewportSpotCount = useMemo(() => {
    if (!mapBounds) return filteredSpots.length
    return filteredSpots.filter(s => {
      const lat = s.display_lat ?? s.exact_lat
      const lng = s.display_lng ?? s.exact_lng
      if (lat == null || lng == null) return false
      return lat >= mapBounds.south && lat <= mapBounds.north && lng >= mapBounds.west && lng <= mapBounds.east
    }).length
  }, [filteredSpots, mapBounds])

  const handleVerify = useCallback((spotId: string) => {
    console.log('Verificar spot:', spotId)
  }, [])

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (creationMode) {
      setTempCoords({ lat, lng })
      if (creationMode === 'spot') setShowSpotForm(true)
      else setShowResortForm(true)
      setCreationMode(null)
    }
  }, [creationMode])


  return (
    <div
      id="app-shell"
      style={{
        display: 'flex',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--color-bg-primary)',
      }}
    >
      <Sidebar
        isOnline={isOnline}
        pendingSync={pendingSync}
      />

      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapFiltersBar
          filters={filters}
          onChange={setFilters}
          spotCount={viewportSpotCount}
          user={user}
          theme={mapTheme}
          highlights={viewportHighlights}
          onHighlightClick={handleHighlightClick}
        />



              <FishingMap
                spots={filteredSpots}
                onSpotSelect={handleSpotSelect}
                onMapClick={handleMapClick}
                selectedSpotId={activeSpotId}
                filterLureType={filters.lureType}
                theme={mapTheme}
                onBoundsChange={setMapBounds}
              />

        {creationMode && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] glass p-4 rounded-2xl border-accent/30 animate-bounce">
             <div className="flex items-center gap-3">
                <MapPin className="text-accent" />
                <p className="text-sm font-black text-white uppercase tracking-widest">
                   {creationMode === 'resort'
                     ? 'Clique no mapa para posicionar o Pesqueiro'
                     : 'Clique no mapa para posicionar o Ponto de Pesca'}
                </p>
             </div>
          </div>
        )}

        <div
          className={`fab-square-container ${drawerOpen ? 'drawer-open' : ''}`}
          style={{
            position: 'absolute',
            bottom: 17,
            right: 17,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 56px)',
            gap: 8,
            zIndex: 900,
          }}
        >
          {/* Top-Right: Nova Captura (Agora ocupa a linha superior inteira ou fica sozinho) */}
          <button
            id="fab-new-capture"
            className="btn-primary"
            onClick={() => setShowCaptureForm(true)}
            style={{
              width: 56, height: 56, borderRadius: 16, padding: 0,
              boxShadow: '0 8px 32px rgba(0, 212, 170, 0.4)',
              gridColumn: '2', // Mantém na segunda coluna
            }}
            title="Nova Captura"
          >
            <Plus size={24} />
          </button>

          {/* Bottom-Left: Baixar Mapa Offline */}
          <button
            className="btn-secondary"
            onClick={() => {
              if (user?.profile?.subscription_tier === 'free' || !user) {
                setPaywallFeature('Mapas Offline')
                setShowPaywall(true)
              } else {
                alert('Iniciando download do mapa offline...')
              }
            }}
            style={{
              width: 56, height: 56, borderRadius: 16, padding: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
            title="Baixar Mapa Offline"
          >
            <Download size={20} className="text-blue-400" />
          </button>

          {/* Bottom-Right: Adicionar Ponto de Pesca */}
          <button
            id="fab-new-spot"
            className={`btn-secondary ${creationMode === 'spot' ? 'ring-2 ring-accent' : ''}`}
            onClick={() => setCreationMode(creationMode === 'spot' ? null : 'spot')}
            style={{
              width: 56, height: 56, borderRadius: 16, padding: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
            title="Adicionar Ponto de Pesca"
          >
            <MapPin size={22} color="var(--color-accent-primary)" />
          </button>
        </div>

        {!isOnline && (
          <div className="glass absolute" style={{ bottom: 16, left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: 10, zIndex: 900, borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>Modo Offline — capturas serão salvas localmente</span>
          </div>
        )}

        {isOnline && pendingSync > 0 && (
          <div 
            className="glass absolute" 
            style={{ 
              bottom: 16, 
              left: '50%', 
              transform: 'translateX(-50%)', 
              padding: '10px 20px', 
              borderRadius: 12, 
              zIndex: 900, 
              borderColor: user ? 'rgba(0, 212, 170, 0.3)' : 'rgba(245, 158, 11, 0.3)',
              display: 'flex', 
              alignItems: 'center', 
              gap: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            {user ? (
              <>
                <RefreshCw size={14} color="var(--color-accent-primary)" className="animate-spin" />
                <span className="text-[11px] font-black uppercase text-accent tracking-widest leading-none">
                  Sincronizando {pendingSync} item(ns)...
                </span>
              </>
            ) : (
              <>
                <Info size={14} color="#f59e0b" />
                <span className="text-[11px] font-black uppercase text-amber-500 tracking-widest leading-none">
                  Faça login para salvar {pendingSync} item(ns)
                </span>
              </>
            )}
          </div>
        )}
      </main>

      <SpotDetailsView
        spot={selectedSpot}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setActiveSpotId(null)
          setSelectedSpot(null)
        }}
        onNewCapture={handleNewCapture}
        user={user}
        onShowPaywall={(feature) => {
          setPaywallFeature(feature)
          setShowPaywall(true)
        }}
      />

      {showCaptureForm && (
        <NewCaptureForm
          spotId={activeSpotId}
          userId={userId}
          isOnline={isOnline}
          onClose={() => setShowCaptureForm(false)}
          onSuccess={() => setShowCaptureForm(false)}
        />
      )}

      {showSpotForm && (
        <NewSpotForm
          userId={userId}
          isOnline={isOnline}
          initialLat={tempCoords?.lat}
          initialLng={tempCoords?.lng}
          onClose={() => { setShowSpotForm(false); setTempCoords(null); }}
          onSuccess={() => { setShowSpotForm(false); setTempCoords(null); fetchSpots(); }}
          onSwitchToResort={() => { setShowSpotForm(false); setShowResortForm(true); }}
        />
      )}

      {showResortForm && (
        <NewResortForm
          userId={userId}
          isOnline={isOnline}
          initialLat={tempCoords?.lat}
          initialLng={tempCoords?.lng}
          onClose={() => { setShowResortForm(false); setTempCoords(null); }}
          onSuccess={() => { setShowResortForm(false); setTempCoords(null); fetchSpots(); }}
        />
      )}

      {showPaywall && (
        <PaywallModal 
          isOpen={showPaywall} 
          onClose={() => setShowPaywall(false)} 
          featureName={paywallFeature}
        />
      )}

      {showWelcome && (
        <WelcomeOverlay 
          onClose={() => {
            setShowWelcome(false)
            // Atualizar o state do usuário localmente também
            setUser((prev: any) => prev ? { ...prev, profile: { ...prev.profile, is_first_login: false } } : null)
          }} 
        />
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#0a0f1a] flex flex-col items-center justify-center text-white">
      <div className="w-32 h-32 mb-4 animate-pulse mix-blend-screen">
        <img src="/images/logo.png" alt="Fishgada" className="w-full h-full object-contain" />
      </div>
      <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-cyan-500 animate-progress" style={{ width: '100%' }} />
      </div>
    </div>}>
      <HomeContent />
    </Suspense>
  )
}
