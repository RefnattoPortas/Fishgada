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
  const [locationEnabled, setLocationEnabled] = useState(false)

  useEffect(() => {
    // Tentar pegar localização do usuário primeiro, depois carrega os spots
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude])
          setLocationEnabled(true)
          fetchData([pos.coords.latitude, pos.coords.longitude])
        },
        (err) => {
          console.warn('Localização negada ou falhou', err)
          setLocationEnabled(false)
          fetchData(null)
        },
        { timeout: 5000, enableHighAccuracy: true }
      )
    } else {
      fetchData(null)
    }
  }, [])

  const fetchData = async (location: [number, number] | null) => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('spots_map_view')
        .select('*')

      if (error) throw error

      let finalSpots = data as (SpotMapView & { distance_km?: number })[]
      
      // Calculate distances if we have location
      if (location) {
        finalSpots = finalSpots.map(s => ({
          ...s,
          distance_km: calculateDistance(location[0], location[1], s.exact_lat || s.display_lat, s.exact_lng || s.display_lng)
        }))
        
        // Ordenar do mais proximo ao mais distante
        finalSpots.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0))
      }

      setSpots(finalSpots)
    } catch (e) {
      console.error('Erro ao buscar locais:', e)
    } finally {
      setLoading(false)
    }
  }

  // Filtragem
  const filteredSpots = useMemo(() => {
    if (!searchQuery) return spots
    
    const query = searchQuery.toLowerCase()
    
    return spots.filter(spot => {
      const titleMatch = spot.title?.toLowerCase().includes(query)
      const descMatch = spot.description?.toLowerCase().includes(query)
      
      // Verifica se alguma espécie no pesqueiro (se for partner) bate com a pesquisa
      let speciesMatch = false
      if (spot.resort_main_species) {
        // Se for uma string
        if (typeof spot.resort_main_species === 'string') {
           speciesMatch = spot.resort_main_species.toLowerCase().includes(query)
        }
      }
      
      return titleMatch || descMatch || speciesMatch
    })
  }, [spots, searchQuery])


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
        <div className="sticky top-0 z-40 bg-[#060a12]/90 backdrop-blur-xl px-4 py-4 flex flex-col gap-4 border-b border-white/5 shadow-2xl">
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

        {/* SEARCH BAR */}
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
