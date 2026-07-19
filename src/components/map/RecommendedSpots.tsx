'use client'

import { useState, useMemo } from 'react'
import { Navigation, MapPin, Fish, ChevronDown, ChevronUp, Star } from 'lucide-react'
import type { SpotMapView } from '@/types/database'

interface RecommendedSpotsProps {
  spots: SpotMapView[]
  userLocation?: [number, number] | null
  species?: string
  onSpotFocus: (spot: SpotMapView) => void
}

const PRIVACY_COLORS: Record<string, string> = {
  public: '#00d4aa',
  community: '#f59e0b',
  private: '#ef4444',
  partner: '#a855f7',
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function RecommendedSpots({
  spots,
  userLocation,
  species,
  onSpotFocus,
}: RecommendedSpotsProps) {
  const [expanded, setExpanded] = useState(false)

  const spotsWithDistance = useMemo(() => {
    return spots.map(s => {
      const lat = s.exact_lat
      const lng = s.exact_lng
      return {
        ...s,
        _distance: userLocation && lat != null && lng != null
          ? calculateDistance(userLocation[0], userLocation[1], lat, lng)
          : undefined,
      }
    })
  }, [spots, userLocation])

  const sections = useMemo(() => {
    const result: { label: string; spots: (SpotMapView & { _distance?: number })[] }[] = []

    // Perto de você
    if (userLocation) {
      const nearby = [...spotsWithDistance]
        .filter(s => s._distance !== undefined && s._distance < 50)
        .sort((a, b) => (a._distance || 0) - (b._distance || 0))
        .slice(0, 3)
      if (nearby.length > 0) {
        result.push({ label: 'Perto de você', spots: nearby })
      }
    }

    // Melhores para a espécie selecionada
    if (species) {
      const bySpecies = spotsWithDistance.filter(s => {
        const target = (
          s.title + ' ' +
          String((s as any).searchable_species || '') + ' ' +
          String((s as any).resort_main_species || '')
        ).toLowerCase()
        return target.includes(species.toLowerCase())
      }).slice(0, 3)
      if (bySpecies.length > 0) {
        result.push({ label: `Melhores para ${species}`, spots: bySpecies })
      }
    }

    // Parceiros em destaque
    const partners = spotsWithDistance.filter(s => s.is_resort_partner).slice(0, 3)
    if (partners.length > 0) {
      result.push({ label: 'Parceiros em destaque', spots: partners })
    }

    // Mais ativos
    const active = [...spotsWithDistance]
      .filter(s => s.total_captures > 0)
      .sort((a, b) => b.total_captures - a.total_captures)
      .slice(0, 3)
    if (active.length > 0 && !result.some(r => r.label.includes('Perto'))) {
      result.push({ label: 'Mais ativos', spots: active })
    }

    return result
  }, [spotsWithDistance, userLocation, species])

  if (sections.length === 0) {
    return (
      <div className="px-4 py-3 text-center">
        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">
          Nenhuma recomendação disponível no momento
        </p>
        <p className="text-[10px] text-gray-600 mt-1">
          Explore o mapa para descobrir locais de pesca
        </p>
      </div>
    )
  }

  return (
    <div
      className="border-t border-white/5"
      role="region"
      aria-label="Locais recomendados"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
        aria-expanded={expanded}
        aria-controls="recommended-panel"
      >
        <div className="flex items-center gap-2">
          <Star size={14} className="text-amber-400" />
          <span className="text-[11px] font-black uppercase tracking-widest text-gray-300">
            Recomendados
          </span>
          <span className="text-[10px] font-bold text-gray-500">
            ({sections.length} seções)
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>

      {expanded && (
        <div id="recommended-panel" className="px-4 pb-4 space-y-4">
          {sections.map((section) => (
            <div key={section.label}>
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                {section.label}
              </h4>
              <div className="space-y-2">
                {section.spots.map((spot) => {
                  const pinType = spot.is_resort_partner ? 'partner' : spot.privacy_level
                  const pinColor = PRIVACY_COLORS[pinType] || '#00d4aa'
                  const imageUrl = spot.photo_url ||
                    (Array.isArray((spot as any).resort_photos) && (spot as any).resort_photos[0])

                  return (
                    <button
                      key={spot.id}
                      onClick={() => onSpotFocus(spot)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all text-left border border-transparent hover:border-white/10"
                    >
                      <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin size={16} className="text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[12px] font-bold text-white truncate">{spot.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          {spot._distance !== undefined && (
                            <span className="flex items-center gap-0.5">
                              <Navigation size={8} className="text-cyan-400" />
                              {spot._distance < 1 ? '<1km' : `${spot._distance.toFixed(0)}km`}
                            </span>
                          )}
                          <span className="w-1 h-1 rounded-full bg-gray-600" />
                          <span style={{ color: pinColor }} className="font-bold">
                            {pinType === 'partner' ? 'Parceiro' : pinType === 'public' ? 'Público' : pinType === 'community' ? 'Comunitário' : 'Privado'}
                          </span>
                          {spot.total_captures > 0 && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-gray-600" />
                              <span><Fish size={8} className="inline text-cyan-400" /> {spot.total_captures}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Navigation size={14} className="text-gray-500 flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
