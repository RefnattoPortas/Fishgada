'use client'

import { useState, useEffect, useMemo } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { SpotMapView } from '@/types/database'
import { MapPin, Search, Navigation, Compass, Fish, Droplet, Users, Lock, Star, ExternalLink, ChevronLeft, Utensils, Baby, Trophy, Warehouse } from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'

// Constants
const PRIVACY_COLORS: Record<string, string> = {
  public: '#00d4aa',
  community: '#f59e0b',
  private: '#ef4444',
  partner: '#a855f7',
}

// Experience category definitions
type ExperienceCategory = 'all' | 'gastronomia' | 'familia' | 'iniciantes' | 'esportiva'

const EXPERIENCE_CATEGORIES = [
  {
    id: 'all' as ExperienceCategory,
    label: 'Todos',
    emoji: '🗺️',
    color: '#00d4aa',
    description: 'Todos os locais',
  },
  {
    id: 'gastronomia' as ExperienceCategory,
    label: 'Gastronomia',
    emoji: '🥘',
    color: '#f59e0b',
    description: 'Pesqueiros com restaurante',
  },
  {
    id: 'familia' as ExperienceCategory,
    label: 'Família',
    emoji: '👨‍👩‍👧‍👦',
    color: '#a855f7',
    description: 'Lazer e área kids',
  },
  {
    id: 'iniciantes' as ExperienceCategory,
    label: 'Iniciantes',
    emoji: '🎣',
    color: '#0ea5e9',
    description: 'Fácil, peixe pré-dispostos',
  },
  {
    id: 'esportiva' as ExperienceCategory,
    label: 'Esportiva',
    emoji: '🏆',
    color: '#ef4444',
    description: 'Alta performance, peixe grande',
  },
]

// Distance Calculation (Haversine formula) in KM
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Checks if a spot matches a given experience category
const matchesCategory = (spot: SpotMapView, category: ExperienceCategory): boolean => {
  if (category === 'all') return true
  const infra = (spot.resort_infrastructure as any) || {}

  if (category === 'gastronomia') {
    // Uses the new specialty tag OR the legacy 'restaurante' infra key
    return !!spot.is_resort && (infra.especialidade_restaurante === true || infra.restaurante === true)
  }
  if (category === 'familia') {
    return !!spot.is_resort && (infra.especialidade_kids === true || infra.especialidade_familia === true || infra.banheiros === true || infra.pousada === true)
  }
  if (category === 'iniciantes') {
    return !!spot.is_resort && (infra.especialidade_familia === true || spot.water_type === 'lake')
  }
  if (category === 'esportiva') {
    return (!!spot.is_resort && infra.especialidade_esportiva === true) || (spot.total_captures || 0) > 10 || spot.water_type === 'river' || spot.water_type === 'reservoir'
  }
  return true
}

export default function ExplorePage() {
  const [spots, setSpots] = useState<(SpotMapView & { distance_km?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [referencePoint, setReferencePoint] = useState<[number, number] | null>(null)
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [maxDistance, setMaxDistance] = useState(100)
  const [isPro, setIsPro] = useState(false)
  const [citySearch, setCitySearch] = useState('')
  const [searchResults, setSearchResults] = useState<{name: string, lat: number, lng: number}[]>([])
  const [searching, setSearching] = useState(false)
  const [activeCategory, setActiveCategory] = useState<ExperienceCategory>('all')
  const [onlyResorts, setOnlyResorts] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single() as any
        setIsPro(data?.subscription_tier === 'pro' || data?.subscription_tier === 'partner')
      }
    }
    fetchProfile()

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
          setUserLocation(coords)
          setReferencePoint(coords)
          setLocationEnabled(true)
          fetchData(coords)
        },
        () => {
          setLocationEnabled(false)
          const defaultCoords: [number, number] = [-23.5505, -46.6333]
          setReferencePoint(defaultCoords)
          fetchData(defaultCoords)
        },
        { timeout: 5000, enableHighAccuracy: true }
      )
    } else {
      fetchData(null)
    }
  }, [])

  const fetchData = async (ref: [number, number] | null) => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from('spots_map_view').select('*')
      if (error) throw error

      let finalSpots = data as (SpotMapView & { distance_km?: number })[]

      if (ref) {
        finalSpots = finalSpots.map(s => ({
          ...s,
          distance_km: calculateDistance(ref[0], ref[1], s.exact_lat || s.display_lat, s.exact_lng || s.display_lng)
        }))
      }

      setSpots(finalSpots)
    } catch (e) {
      console.error('Erro ao buscar locais:', e)
    } finally {
      setLoading(false)
    }
  }

  const searchCities = async (query: string) => {
    if (query.length < 3) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=5`)
      const data = await res.json()
      setSearchResults(data.map((item: any) => ({ name: item.display_name, lat: parseFloat(item.lat), lng: parseFloat(item.lon) })))
    } catch (err) {
      console.error('Erro ao buscar cidades:', err)
    } finally {
      setSearching(false)
    }
  }

  const filteredSpots = useMemo(() => {
    let result = spots

    // 1. Só resorts
    if (onlyResorts || activeCategory !== 'all') {
      result = result.filter(s => s.is_resort)
    }

    // 2. Filtro de categoria de experiência
    if (activeCategory !== 'all') {
      result = result.filter(s => matchesCategory(s, activeCategory))
    }

    // 3. Distância
    if (referencePoint) {
      result = result.filter(s => (s.distance_km || 0) <= maxDistance)
      result.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0))
    }

    // 4. Texto
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(spot => {
        const titleMatch = spot.title?.toLowerCase().includes(query)
        const descMatch = spot.description?.toLowerCase().includes(query)
        const speciesMatch = typeof spot.resort_main_species === 'string' && spot.resort_main_species.toLowerCase().includes(query)
        return titleMatch || descMatch || speciesMatch
      })
    }

    return result
  }, [spots, searchQuery, maxDistance, referencePoint, activeCategory, onlyResorts])

  const activeCat = EXPERIENCE_CATEGORIES.find(c => c.id === activeCategory)!

  return (
    <div id="app-shell" style={{ display: 'flex', width: '100vw', height: '100dvh', overflow: 'hidden', background: 'var(--color-bg-primary)' }}>
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-y-auto text-white pb-32">
        {/* ── HEADER ──────────────────────────────────────── */}
        <div className="sticky top-0 z-40 bg-[#060a12]/95 backdrop-blur-xl mobile-header-padding pr-4 pt-4 pb-3 border-b border-white/5 shadow-2xl flex flex-col gap-3">

          {/* Title row */}
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0 text-white/70">
              <ChevronLeft size={24} />
            </Link>
            <div className="flex flex-col min-w-0">
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2 truncate">
                <Compass size={22} className="text-cyan-400" />
                Explorar Locais
              </h1>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">
                {locationEnabled ? 'Com base na sua localização' : 'Localização indisponível'}
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por pesqueiro, espécie ou rio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0f1a] border border-white/10 text-white rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-medium text-sm placeholder:text-white/20"
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          </div>

          {/* ── EXPERIENCE CATEGORY PILLS ─────────────────── */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {EXPERIENCE_CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-200 border whitespace-nowrap"
                  style={isActive ? {
                    backgroundColor: `${cat.color}20`,
                    borderColor: `${cat.color}60`,
                    color: cat.color,
                    boxShadow: `0 0 12px ${cat.color}30`,
                  } : {
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: '#6b7280',
                  }}
                  title={cat.description}
                >
                  <span className="text-base leading-none">{cat.emoji}</span>
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* ── SUB-FILTERS ──────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Distance */}
            <div className="flex-1 relative">
              <select
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full bg-[#0a0f1a] border border-white/10 text-white rounded-xl py-2.5 pl-4 pr-10 focus:outline-none focus:border-cyan-500/50 transition-all font-bold text-sm appearance-none cursor-pointer hover:border-white/20"
              >
                {[5, 10, 30, 60, 100, 170, 250].map(d => (
                  <option key={d} value={d}>📍 Até {d} km</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                <Navigation size={14} className="rotate-90" />
              </div>
            </div>

            {/* City search (Pro) */}
            <div className="flex-1 relative">
              <input
                type="text"
                disabled={!isPro}
                placeholder={locationEnabled ? 'Sua Localização — alterar...' : 'Digite uma cidade...'}
                value={citySearch}
                onChange={(e) => { setCitySearch(e.target.value); searchCities(e.target.value) }}
                className={`w-full bg-[#0a0f1a] border border-white/10 text-white rounded-xl py-2.5 pl-4 pr-10 focus:outline-none focus:border-cyan-500/50 transition-all font-medium text-sm ${!isPro ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'}`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                {searching ? <div className="w-3 h-3 border border-cyan-400 border-t-transparent animate-spin rounded-full" /> : <MapPin size={14} />}
              </div>
              {!isPro && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-1 text-amber-500">
                  <Lock size={10} />
                  <span className="text-[9px] font-black">Pro</span>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0f1a] border border-white/10 rounded-xl overflow-hidden z-[100] shadow-2xl">
                  {searchResults.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => {
                        const coords: [number, number] = [city.lat, city.lng]
                        setReferencePoint(coords)
                        setCitySearch(city.name.split(',')[0])
                        setSearchResults([])
                        fetchData(coords)
                      }}
                      className="w-full px-4 py-3 text-left text-xs font-bold text-white hover:bg-white/5 border-b border-white/5 last:border-0 truncate"
                    >
                      {city.name}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      if (userLocation) { setReferencePoint(userLocation); setCitySearch(''); setSearchResults([]); fetchData(userLocation) }
                    }}
                    className="w-full px-4 py-3 text-left text-[10px] font-black uppercase text-cyan-400 hover:bg-white/5"
                  >
                    📍 Usar Minha Localização
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CONTENT ─────────────────────────────────────── */}
        <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-6">

          {/* Context Banner */}
          {activeCategory !== 'all' && (
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-2xl border text-sm font-bold fade-in"
              style={{
                backgroundColor: `${activeCat.color}10`,
                borderColor: `${activeCat.color}30`,
                color: activeCat.color,
              }}
            >
              <span className="text-2xl">{activeCat.emoji}</span>
              <div>
                <p className="font-black uppercase tracking-widest text-[10px]">{activeCat.label}</p>
                <p className="text-xs opacity-80">{activeCat.description} — {filteredSpots.length} local(is) encontrado(s)</p>
              </div>
              <button
                onClick={() => setActiveCategory('all')}
                className="ml-auto text-[10px] uppercase font-black opacity-60 hover:opacity-100 transition-opacity"
              >
                Limpar ✕
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner w-8 h-8 border-2 border-cyan-400 border-t-transparent" />
            </div>
          ) : filteredSpots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 fade-in">
              <span className="text-5xl">{activeCat.emoji}</span>
              <p className="text-white/40 text-sm font-bold uppercase tracking-widest">
                {activeCategory !== 'all' ? `Nenhum local de ${activeCat.label} encontrado.` : 'Nenhum ponto encontrado.'}
              </p>
              {activeCategory !== 'all' && (
                <button onClick={() => setActiveCategory('all')} className="text-cyan-400 text-xs font-black uppercase tracking-widest hover:underline">
                  Ver todos os locais →
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpots.map((spot) => {
                const pinType = spot.is_resort_partner ? 'partner' : spot.privacy_level || 'public'
                const pinColor = PRIVACY_COLORS[pinType] || PRIVACY_COLORS.public
                const infra = (spot.resort_infrastructure as any) || {}

                // Experience tags this spot matches
                const expTags = EXPERIENCE_CATEGORIES.filter(c => c.id !== 'all' && matchesCategory(spot, c.id))

                const colorHex = pinColor.replace('#', '')
                const imageUrl = spot.is_resort && (spot as any).photos?.[0]
                  ? (spot as any).photos[0]
                  : `https://placehold.co/600x400/0a0f1a/${colorHex}?font=Montserrat&text=${encodeURIComponent(spot.title.charAt(0).toUpperCase() + spot.title.slice(1, 15))}`

                return (
                  <div
                    key={spot.id}
                    className="group relative flex flex-col bg-[#0a0f1a] rounded-[24px] overflow-hidden transition-all duration-300 hover:-translate-y-1 border border-white/5"
                    style={{ boxShadow: `0 0 20px ${pinColor}15, inset 0 0 50px ${pinColor}05` }}
                  >
                    {/* Neon Border */}
                    <div className="absolute top-0 inset-x-0 h-1 z-20" style={{ background: `linear-gradient(90deg, transparent, ${pinColor}, transparent)` }} />

                    {/* Photo */}
                    <div className="relative w-full h-44 bg-slate-900 border-b border-white/5 overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={spot.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-transparent to-transparent" />

                      {/* Top badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        <div
                          className="px-2 py-0.5 rounded-md flex items-center gap-1.5 backdrop-blur-md"
                          style={{ backgroundColor: `${pinColor}20`, border: `1px solid ${pinColor}40` }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pinColor }} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white leading-none">
                            {pinType === 'partner' ? 'Parceiro' : pinType === 'public' ? 'Público' : pinType === 'community' ? 'Comunidade' : 'Privado'}
                          </span>
                        </div>
                      </div>

                      {/* Distance badge */}
                      {spot.distance_km !== undefined && (
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded flex items-center gap-1">
                          <Navigation size={10} className="text-cyan-400" />
                          <span className="text-[10px] font-black text-white">{spot.distance_km < 1 ? '< 1' : spot.distance_km.toFixed(1)} km</span>
                        </div>
                      )}

                      {/* Title */}
                      <div className="absolute bottom-3 left-4 right-4">
                        <h2 className="text-lg font-black text-white truncate drop-shadow-md">{spot.title}</h2>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4 flex flex-col gap-3 flex-1">
                      {/* Experience tags */}
                      {expTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {expTags.map(tag => (
                            <span
                              key={tag.id}
                              className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}30` }}
                            >
                              {tag.emoji} {tag.label}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-[11px] text-gray-400 font-medium leading-relaxed line-clamp-2">
                        {spot.description || 'Nenhuma descrição fornecida para este ponto.'}
                      </p>

                      {/* Infrastructure quick icons */}
                      {spot.is_resort && (
                        <div className="flex gap-3 text-gray-600">
                          {infra.restaurante && (
                            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-500/70" title="Restaurante">
                              <Utensils size={12} /> <span>Rest.</span>
                            </div>
                          )}
                          {infra.pousada && (
                            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-purple-400/70" title="Hospedagem">
                              <Warehouse size={12} /> <span>Pousada</span>
                            </div>
                          )}
                          {infra.banheiros && (
                            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-400/70" title="Banheiros">
                              <Users size={12} /> <span>Estrutura</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col gap-2 mt-auto">
                        <div className="flex items-center gap-4 border-t border-white/5 pt-3">
                          {spot.water_type && (
                            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500">
                              <Droplet size={12} className="text-cyan-400" />
                              <span>{spot.water_type === 'river' ? 'Rio' : spot.water_type === 'lake' ? 'Lago' : spot.water_type === 'sea' ? 'Mar' : 'Represa'}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500">
                            <Fish size={12} className="text-accent" />
                            <span>{spot.total_captures || 0} Capturas</span>
                          </div>
                          {spot.is_verified && (
                            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-500">
                              <Star size={12} className="fill-amber-500" />
                              <span>Verificado</span>
                            </div>
                          )}
                        </div>

                        <Link
                          href={`/radar?selectSpot=${spot.id}`}
                          className="mt-1 w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest"
                          style={{
                            backgroundColor: `${pinColor}10`,
                            color: pinColor,
                            border: `1px solid ${pinColor}30`,
                          }}
                        >
                          <ExternalLink size={14} />
                          Exibir no Mapa
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
