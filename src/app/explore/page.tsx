'use client'

import { useState, useEffect, useMemo } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { SpotMapView } from '@/types/database'
import { MapPin, Search, Navigation, Compass, Fish, Droplet, Users, Lock, Star, ExternalLink, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { ALL_SPECIES } from '@/lib/data/species'
import Sidebar from '@/components/layout/Sidebar'

// Constants
const PRIVACY_COLORS: Record<string, string> = {
  public: '#00d4aa',
  community: '#f59e0b',
  private: '#ef4444',
  partner: '#a855f7',
}

// Distance Calculation (Haversine formula) in KM
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371 // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) 
  const d = R * c
  return d
}

export default function ExplorePage() {
  const [spots, setSpots] = useState<(SpotMapView & { distance_km?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [referencePoint, setReferencePoint] = useState<[number, number] | null>(null)
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [maxDistance, setMaxDistance] = useState(100)
  const [profile, setProfile] = useState<any>(null)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single() as any
        setProfile(data)
        setIsPro(data?.subscription_tier === 'pro' || data?.subscription_tier === 'partner')
      }
    }
    fetchProfile()

    // Tentar pegar localização do usuário primeiro, depois carrega os spots
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude]
          setUserLocation(coords)
          setReferencePoint(coords)
          setLocationEnabled(true)
          fetchData(coords)
        },
        (err) => {
          console.warn('Localização negada ou falhou', err)
          setLocationEnabled(false)
          // Default to a central point if unavailable (e.g. Sâo Paulo/Rio)
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
      const { data, error } = await supabase
        .from('spots_map_view')
        .select('*')

      if (error) throw error

      let finalSpots = data as (SpotMapView & { distance_km?: number })[]
      
      // Calculate distances if we have a reference point
      if (ref) {
        finalSpots = finalSpots.map(s => ({
          ...s,
          distance_km: calculateDistance(ref[0], ref[1], s.exact_lat || s.display_lat, s.exact_lng || s.display_lng)
        }))
        
        // Filter by 100km limit by default (or current maxDistance)
        // But the user said "o limite de exibição deve ser 100km realmente"
        // so any card > 100km should probably be hidden.
      }

      setSpots(finalSpots)
    } catch (e) {
      console.error('Erro ao buscar locais:', e)
    } finally {
      setLoading(false)
    }
  }

  // Filtragem final
  const filteredSpots = useMemo(() => {
    let result = spots

    // 1. Filtro de Distância (Sempre limite real de 100km)
    if (referencePoint) {
      result = result.filter(s => (s.distance_km || 0) <= maxDistance)
      // Ordenar do mais proximo ao mais distante
      result.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0))
    }

    // 2. Filtro de Texto
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(spot => {
        const titleMatch = spot.title?.toLowerCase().includes(query)
        const descMatch = spot.description?.toLowerCase().includes(query)
        let speciesMatch = false
        if (spot.resort_main_species && typeof spot.resort_main_species === 'string') {
           speciesMatch = spot.resort_main_species.toLowerCase().includes(query)
        }
        return titleMatch || descMatch || speciesMatch
      })
    }
    
    return result
  }, [spots, searchQuery, maxDistance, referencePoint])


  // Popular Fishing Cities for Pro Users
  const FISHING_CITIES = [
    { name: 'Cáceres - MT', lat: -16.0708, lng: -57.6789 },
    { name: 'Corumbá - MS', lat: -19.0091, lng: -57.6528 },
    { name: 'Manaus - AM', lat: -3.1190, lng: -60.0217 },
    { name: 'Barcelos - AM', lat: -0.9723, lng: -62.9238 },
    { name: 'Salvador - BA', lat: -12.9714, lng: -38.5014 },
    { name: 'São Paulo - SP', lat: -23.5505, lng: -46.6333 },
    { name: 'Rio de Janeiro - RJ', lat: -22.9068, lng: -43.1729 },
  ]

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
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-y-auto app-bg text-white pb-32">
        {/* HEADER */}
        <div className="sticky top-0 z-40 bg-[#060a12]/90 backdrop-blur-xl mobile-header-padding pr-4 py-4 flex flex-col gap-4 border-b border-white/5 shadow-2xl">
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

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col gap-4">
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

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Distance Filter */}
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                Distância Máxima: <span className="text-cyan-400">{maxDistance}km</span>
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[5, 10, 30, 60, 100].map(d => (
                  <button
                    key={d}
                    onClick={() => setMaxDistance(d)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      maxDistance === d 
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.1)]' 
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {d}km
                  </button>
                ))}
              </div>
            </div>

            {/* Location Selection (Pro Only) */}
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center justify-between">
                Local de Referência
                {!isPro && <span className="text-amber-500 flex items-center gap-1"><Lock size={10} /> Pro</span>}
              </label>
              <div className="relative">
                <select 
                  disabled={!isPro}
                  value={referencePoint ? `${referencePoint[0]},${referencePoint[1]}` : ''}
                  onChange={(e) => {
                    const [lat, lng] = e.target.value.split(',').map(Number)
                    const coords: [number, number] = [lat, lng]
                    setReferencePoint(coords)
                    fetchData(coords)
                  }}
                  className={`w-full bg-[#0a0f1a] border border-white/10 text-white rounded-xl py-2.5 pl-4 pr-10 focus:outline-none transition-all font-medium text-sm appearance-none ${!isPro ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-white/20'}`}
                >
                  <option value={userLocation ? `${userLocation[0]},${userLocation[1]}` : ''}>📍 Minha Localização</option>
                  {FISHING_CITIES.map(city => (
                    <option key={city.name} value={`${city.lat},${city.lng}`}>{city.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                   <Navigation size={14} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
        
        {loading ? (
           <div className="flex items-center justify-center py-20">
             <div className="spinner w-8 h-8 border-2 border-cyan-400 border-t-transparent" />
           </div>
        ) : filteredSpots.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-center gap-4 fade-in">
             <Compass size={48} className="text-white/10" />
             <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Nenhum ponto encontrado.</p>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpots.map((spot) => {
                 const pinType = spot.is_resort_partner ? 'partner' : spot.privacy_level || 'public'
                 const pinColor = PRIVACY_COLORS[pinType] || PRIVACY_COLORS.public
                 
                 // Imagem de fallback usando um placeholder genérico premium com a cor do neon
                 const colorHex = pinColor.replace('#', '')
                 const imageUrl = `https://placehold.co/600x400/0a0f1a/${colorHex}?font=Montserrat&text=${encodeURIComponent(spot.title.charAt(0).toUpperCase() + spot.title.slice(1, 15))}`
                 
                 return (
                   <div 
                     key={spot.id} 
                     className="group relative flex flex-col bg-[#0a0f1a] rounded-[24px] overflow-hidden transition-all duration-300 hover:-translate-y-1 border border-white/5"
                     style={{
                       boxShadow: `0 0 20px ${pinColor}15, inset 0 0 50px ${pinColor}05`,
                     }}
                   >
                      {/* Neon Border Top Effect */}
                      <div className="absolute top-0 inset-x-0 h-1 z-20" style={{ background: `linear-gradient(90deg, transparent, ${pinColor}, transparent)` }} />

                      {/* Header Photo Area */}
                      <div className="relative w-full h-40 bg-slate-900 border-b border-white/5 overflow-hidden">
                         <img 
                           src={imageUrl} 
                           alt={spot.title}
                           className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                           crossOrigin="anonymous"
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] to-transparent" />
                         
                         {/* Badges In the Photo */}
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
                         
                         {/* Distance Badge */}
                         {spot.distance_km !== undefined && (
                           <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded flex items-center gap-1">
                              <Navigation size={10} className="text-cyan-400" />
                              <span className="text-[10px] font-black text-white">{spot.distance_km < 1 ? '< 1' : spot.distance_km.toFixed(1)} km</span>
                           </div>
                         )}

                         {/* Title */}
                         <div className="absolute bottom-3 left-4 right-4">
                            <h2 className="text-lg font-black text-white truncate drop-shadow-md">
                              {spot.title}
                            </h2>
                         </div>
                      </div>

                      {/* Details Area */}
                      <div className="p-4 flex flex-col gap-4 flex-1">
                         <p className="text-[11px] text-gray-400 font-medium leading-relaxed line-clamp-2">
                            {spot.description || 'Nenhuma descrição fornecida para este ponto.'}
                         </p>

                         <div className="flex flex-col gap-2 mt-auto">
                            {/* Stats row */}
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

                            {/* Action Button */}
                            <Link 
                               href={`/?selectSpot=${spot.id}`}
                               className="mt-2 w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest"
                               style={{ 
                                 backgroundColor: `${pinColor}10`,
                                 color: pinColor,
                                 border: `1px solid ${pinColor}30`
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
