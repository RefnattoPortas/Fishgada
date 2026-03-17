'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/layout/Sidebar'
import SpotDetailsView from '@/components/map/SpotDetailsView'
import MapFiltersBar, { MapFilters } from '@/components/map/MapFiltersBar'
import type { SpotMapView } from '@/types/database'
import { Plus, RefreshCw, MapPin } from 'lucide-react'

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
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003', user_id: '00000000-0000-0000-0000-000000000003', title: 'Buraco Secreto do Zé',
    description: 'Meu ponto preferido. Traíra enorme!',
    privacy_level: 'private', fuzz_radius_m: 0, water_type: 'lake',
    is_verified: false, verification_count: 0, community_unlock_captures: 10,
    created_at: '2025-10-01T06:30:00Z',
    display_lat: -15.9, display_lng: -49.3, exact_lat: -15.9, exact_lng: -49.3,
    total_captures: 5, latest_lure_type: 'natural_bait', latest_lure_model: 'Minhoca',
    latest_lure_color: null, photo_url: null, owner_name: 'Zé das Traíras', owner_avatar: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004', user_id: '00000000-0000-0000-0000-000000000004', title: 'Pantanal — Curva do Rio',
    description: 'Pintado e dourado em abundância na cheia. Setup de fundo garante captura.',
    privacy_level: 'public', fuzz_radius_m: 0, water_type: 'river',
    is_verified: true, verification_count: 12, community_unlock_captures: 0,
    created_at: '2025-03-01T12:00:00Z',
    display_lat: -18.5, display_lng: -57.2, exact_lat: -18.5, exact_lng: -57.2,
    total_captures: 47, latest_lure_type: 'bottom', latest_lure_model: 'Chumbada Torpedo',
    latest_lure_color: null, photo_url: null, owner_name: 'Carlos Pantaneiro', owner_avatar: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005', user_id: '00000000-0000-0000-0000-000000000005', title: 'Litoral SP — Robalo na Pedra',
    description: 'Pesca de robalo na maré baixa. Crankbait perto dos costões.',
    privacy_level: 'community', fuzz_radius_m: 500, water_type: 'sea',
    is_verified: true, verification_count: 4, community_unlock_captures: 3,
    created_at: '2025-09-20T17:00:00Z',
    display_lat: -23.8, display_lng: -45.4, exact_lat: -23.794, exact_lng: -45.388,
    total_captures: 18, latest_lure_type: 'crankbait', latest_lure_model: 'Storm Rattlin Chug Bug',
    latest_lure_color: 'Branco Pérola', photo_url: null, owner_name: 'André Marinheiro', owner_avatar: null,
  },
]

// Fallback para quando o usuário não está logado
const GUEST_USER_ID = 'guest-user'

export default function HomePage() {
  const [spots, setSpots] = useState<SpotMapView[]>([])
  const [selectedSpot, setSelectedSpot] = useState<SpotMapView | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showCaptureForm, setShowCaptureForm] = useState(false)
  const [showSpotForm, setShowSpotForm] = useState(false)
  const [activeSpotId, setActiveSpotId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSync, setPendingSync] = useState(0)
  const [isLoadingSpots, setIsLoadingSpots] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Monitorar auth
  useEffect(() => {
    const checkUser = async () => {
      const { getSupabaseClient } = await import('@/lib/supabase/client')
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

      return () => subscription.unsubscribe()
    }
    checkUser()
  }, [])

  const userId = user?.id || GUEST_USER_ID

  const [filters, setFilters] = useState<MapFilters>({
    species: '',
    lureType: '',
    waterType: '',
    showOnlyVerified: false,
    showOnlyPublic: false,
  })

  // Buscar spots do Supabase
  useEffect(() => {
    const fetchSpots = async () => {
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
          // Se não houver dados, usa os DEMO_SPOTS para não ficar vazio
          setSpots(DEMO_SPOTS)
        }
      } catch (err: any) {
        console.error('Erro ao buscar spots:', err.message || err.details || err)
        setSpots(DEMO_SPOTS)
      } finally {
        setIsLoadingSpots(false)
      }
    }

    fetchSpots()
  }, [])

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
    if (!isOnline || pendingSync === 0) return
    const doSync = async () => {
      try {
        const { syncPendingData } = await import('@/lib/offline/indexeddb')
        const { getSupabaseClient } = await import('@/lib/supabase/client')
        const supabase = getSupabaseClient()
        const result = await syncPendingData(supabase, userId)
        if (result.synced > 0) {
          setPendingSync(0)
          console.log(`[Sync] ${result.synced} item(ns) sincronizado(s)`)
        }
      } catch {}
    }
    doSync()
  }, [isOnline, pendingSync])

  // Filtrar spots
  const filteredSpots = useMemo(() => {
    return spots.filter(spot => {
      if (filters.species && !spot.title.toLowerCase().includes(filters.species.toLowerCase())) return false
      if (filters.lureType && spot.latest_lure_type !== filters.lureType) return false
      if (filters.waterType && spot.water_type !== filters.waterType) return false
      if (filters.showOnlyVerified && !spot.is_verified) return false
      if (filters.showOnlyPublic && spot.privacy_level !== 'public') return false
      return true
    })
  }, [spots, filters])

  const handleSpotSelect = useCallback((spot: SpotMapView) => {
    setSelectedSpot(spot)
    setActiveSpotId(spot.id)
    setDrawerOpen(true)
  }, [])

  const handleNewCapture = useCallback((spotId: string) => {
    setActiveSpotId(spotId)
    setShowCaptureForm(true)
  }, [])

  const handleVerify = useCallback((spotId: string) => {
    console.log('Verificar spot:', spotId)
  }, [])

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
      {/* ── SIDEBAR ──────────────────────────────────────── */}
      <Sidebar
        isOnline={isOnline}
        pendingSync={pendingSync}
        userLevel={user ? 3 : 1} // Exemplo: nível 3 se logado, 1 se guest
        userXP={user ? 1250 : 0}
      />

      {/* ── MAPA (CENTRO) ────────────────────────────────── */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Filtros flutuantes */}
        <MapFiltersBar
          filters={filters}
          onChange={setFilters}
          spotCount={filteredSpots.length}
        />

        {/* Mapa interativo */}
        <FishingMap
          spots={filteredSpots}
          onSpotSelect={handleSpotSelect}
          selectedSpotId={activeSpotId}
          filterLureType={filters.lureType}
        />

        {/* FAB — Novo Ponto/Captura */}
        <div
          className={`fab-container ${drawerOpen ? 'drawer-open' : ''}`}
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            zIndex: 900,
          }}
        >
          {/* Botão de nova captura rápida */}
          <button
            id="fab-new-capture"
            className="btn-primary"
            onClick={() => setShowCaptureForm(true)}
            style={{
              width: 56, height: 56, borderRadius: 16, padding: 0,
              boxShadow: '0 8px 32px rgba(0, 212, 170, 0.4)',
            }}
            title="Nova Captura"
          >
            <Plus size={24} />
          </button>

          {/* Botão de adicionar ponto */}
          <button
            id="fab-new-spot"
            className="btn-secondary"
            onClick={() => setShowSpotForm(true)}
            style={{
              width: 56, height: 56, borderRadius: 16, padding: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
            title="Adicionar Ponto de Pesca"
          >
            <MapPin size={22} color="var(--color-accent-primary)" />
          </button>
        </div>

        {/* Banner offline */}
        {!isOnline && (
          <div
            className="glass absolute"
            style={{
              bottom: 16, left: '50%', transform: 'translateX(-50%)',
              padding: '10px 20px', borderRadius: 10, zIndex: 900,
              borderColor: 'rgba(239, 68, 68, 0.3)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>
              Modo Offline — capturas serão salvas localmente
            </span>
          </div>
        )}

        {/* Badge de sync pendente */}
        {isOnline && pendingSync > 0 && (
          <div
            className="glass absolute"
            style={{
              bottom: 16, left: '50%', transform: 'translateX(-50%)',
              padding: '10px 20px', borderRadius: 10, zIndex: 900,
              borderColor: 'rgba(245, 158, 11, 0.3)',
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>
              Sincronizando {pendingSync} item(ns)...
            </span>
          </div>
        )}
      </main>

      {/* ── VISUALIZAÇÃO DETALHADA DO PONTO ──────────────── */}
      <SpotDetailsView
        spot={selectedSpot}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setActiveSpotId(null)
        }}
        onNewCapture={handleNewCapture}
      />

      {/* ── FORMULÁRIO DE CAPTURA (Modal) ─────────────────── */}
      {showCaptureForm && (
        <NewCaptureForm
          spotId={activeSpotId}
          userId={userId}
          isOnline={isOnline}
          onClose={() => setShowCaptureForm(false)}
          onSuccess={() => {
            setShowCaptureForm(false)
            console.log('Captura registrada com sucesso!')
          }}
        />
      )}

      {/* ── FORMULÁRIO DE PONTO (Modal) ───────────────────── */}
      {showSpotForm && (
        <NewSpotForm
          userId={userId}
          onClose={() => setShowSpotForm(false)}
          onSuccess={() => {
            setShowSpotForm(false)
            console.log('Ponto adicionado com sucesso!')
          }}
        />
      )}

    </div>
  )
}
