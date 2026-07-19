'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, MapPin, Navigation, Star, Fish, Users, Clock, Camera,
  Share2, Bookmark, Plus, ExternalLink, ChevronDown,
  Warehouse, Utensils, Wifi, Car, Phone, HelpCircle, Award
} from 'lucide-react'
import type { SpotMapView } from '@/types/database'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getSupabaseClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'

const PRIVACY_CONFIG = {
  public: { label: 'Público', color: '#00d4aa' },
  community: { label: 'Comunitário', color: '#f59e0b' },
  private: { label: 'Privado', color: '#ef4444' },
  partner: { label: 'Parceiro', color: '#a855f7' },
}

const INFRA_ICONS: Record<string, { icon: typeof Warehouse; label: string }> = {
  restaurante: { icon: Utensils, label: 'Restaurante' },
  banheiros: { icon: Users, label: 'Banheiros' },
  wi_fi: { icon: Wifi, label: 'Wi-Fi' },
  pousada: { icon: Warehouse, label: 'Hospedagem' },
  estacionamento: { icon: Car, label: 'Estacionamento' },
  telefone: { icon: Phone, label: 'Telefone' },
}

interface SpotBottomSheetProps {
  spot: SpotMapView | null
  isOpen: boolean
  onClose: () => void
  onNewCapture?: (spotId: string) => void
  userLocation?: [number, number] | null
  user?: any
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

export default function SpotBottomSheet({
  spot,
  isOpen,
  onClose,
  onNewCapture,
  userLocation,
  user,
}: SpotBottomSheetProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [sheetHeight, setSheetHeight] = useState(40)
  const sheetRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)

  useEffect(() => {
    if (spot && isOpen) {
      trackEvent('marker_opened', {
        place_type: spot.is_resort_partner ? 'partner' : spot.privacy_level,
      })
      trackEvent('place_details_opened', {
        place_type: spot.is_resort_partner ? 'partner' : spot.privacy_level,
      })

      try {
        const saved = JSON.parse(localStorage.getItem('saved_spots') || '[]')
        setIsSaved(saved.includes(spot.id))
      } catch {
        setIsSaved(false)
      }

      setSheetHeight(40)
    }
  }, [spot?.id, isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    startHeightRef.current = sheetHeight
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = startYRef.current - e.touches[0].clientY
    const newHeight = Math.max(20, Math.min(95, startHeightRef.current + (delta / window.innerHeight) * 100))
    setSheetHeight(newHeight)
  }

  const handleToggleSave = useCallback(() => {
    if (!spot) return
    try {
      const saved = JSON.parse(localStorage.getItem('saved_spots') || '[]')
      if (isSaved) {
        const updated = saved.filter((id: string) => id !== spot.id)
        localStorage.setItem('saved_spots', JSON.stringify(updated))
        setIsSaved(false)
      } else {
        saved.push(spot.id)
        localStorage.setItem('saved_spots', JSON.stringify(Array.from(new Set(saved))))
        setIsSaved(true)
        trackEvent('place_saved', { place_type: spot.is_resort_partner ? 'partner' : spot.privacy_level })
      }
    } catch {}
  }, [spot, isSaved])

  const handleRoute = useCallback(() => {
    if (!spot) return
    const lat = spot.exact_lat ?? spot.display_lat
    const lng = spot.exact_lng ?? spot.display_lng
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
    trackEvent('route_requested', { place_type: spot.is_resort_partner ? 'partner' : spot.privacy_level })
  }, [spot])

  const handleShare = useCallback(() => {
    if (!spot) return
    const url = `${window.location.origin}/radar?selectSpot=${spot.id}`
    if (navigator.share) {
      navigator.share({ title: spot.title, url })
    } else {
      navigator.clipboard.writeText(url)
    }
  }, [spot])

  if (!spot) return null

  const pinType = spot.is_resort_partner ? 'partner' : spot.privacy_level
  const pinColor = PRIVACY_CONFIG[pinType as keyof typeof PRIVACY_CONFIG]?.color || '#00d4aa'
  const spotLat = spot.exact_lat
  const spotLng = spot.exact_lng
  const distance = userLocation && spotLat != null && spotLng != null
    ? calculateDistance(userLocation[0], userLocation[1], spotLat, spotLng)
    : undefined

  const infra = (spot.resort_infrastructure as Record<string, any>) || {}
  const hasInfra = spot.is_resort && Object.values(INFRA_ICONS).some(({ label }) => {
    const key = Object.entries(INFRA_ICONS).find(([, v]) => v.label === label)?.[0]
    return key ? infra[key] : false
  })

  const imageUrl = spot.photo_url ||
    (Array.isArray((spot as any).resort_photos) && (spot as any).resort_photos[0]) ||
    `https://placehold.co/600x400/0a0f1a/${pinColor.replace('#', '')}?text=${encodeURIComponent(spot.title.charAt(0))}`

  const speciesList = (spot as any).resort_main_species
    ? String((spot as any).resort_main_species).split(',').map((s: string) => s.trim())
    : []

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[1000] bg-black/40 md:bg-black/20"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        ref={sheetRef}
        role="dialog"
        aria-label={`Detalhes de ${spot.title}`}
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-[1100] md:right-4 md:top-4 md:left-auto md:w-[420px] md:bottom-4 md:rounded-3xl transition-transform duration-400 ease-out"
        style={{
          transform: isOpen
            ? 'translateY(0)'
            : 'translateY(100%)',
          height: isOpen ? `${sheetHeight}vh` : '0',
          maxHeight: isOpen ? '95vh' : '0',
          minHeight: isOpen ? '25vh' : '0',
          borderRadius: '20px 20px 0 0',
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Drag Handle (mobile only) */}
        <div
          className="md:hidden flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-3 flex-shrink-0 border-b border-white/5">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"
                style={{
                  backgroundColor: `${pinColor}20`,
                  border: `1px solid ${pinColor}40`,
                  color: pinColor,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pinColor }} />
                {pinType === 'partner' ? 'Parceiro' : pinType === 'public' ? 'Público' : pinType === 'community' ? 'Comunitário' : 'Privado'}
              </span>
              {spot.is_verified && (
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                  <Award size={10} /> Verificado
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-white truncate">{spot.title}</h2>
            <div className="flex items-center gap-3 mt-1">
              {distance !== undefined && (
                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                  <MapPin size={10} className="text-cyan-400" />
                  {distance < 1 ? '< 1 km' : `${distance.toFixed(1)} km`}
                </span>
              )}
              <span className="text-[10px] font-bold text-gray-400">
                {spot.total_captures || 0} captura(s)
              </span>
              {spot.water_type && (
                <span className="text-[10px] font-bold text-gray-400">
                  {spot.water_type === 'river' ? 'Rio' : spot.water_type === 'lake' ? 'Lago' : spot.water_type === 'sea' ? 'Mar' : 'Represa'}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
          {/* Cover Image */}
          <div className="relative w-full h-44 bg-slate-900 overflow-hidden flex-shrink-0">
            <img
              src={imageUrl}
              alt={spot.title}
              className="w-full h-full object-cover opacity-70"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-primary)] via-transparent to-transparent" />
            {spot.is_resort_partner && (
              <div className="absolute top-3 right-3">
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-purple-300"
                  style={{ background: 'rgba(168,85,247,0.3)', border: '1px solid rgba(168,85,247,0.5)' }}
                >
                  <Star size={10} fill="#d8b4fe" /> Parceiro
                </span>
              </div>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* Description */}
            {spot.description && (
              <p className="text-[13px] text-gray-400 leading-relaxed">{spot.description}</p>
            )}

            {/* Species */}
            {speciesList.length > 0 && (
              <div>
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Fish size={12} /> Espécies frequentes
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {speciesList.map((sp: string) => (
                    <span key={sp} className="px-2.5 py-1 rounded-full text-[10px] font-bold text-cyan-400"
                      style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)' }}
                    >
                      {sp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Activity indicator */}
            {spot.total_captures > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.15)' }}
              >
                <Clock size={14} className="text-cyan-400" />
                <span className="text-[11px] font-bold text-cyan-400">
                  {spot.total_captures} captura(s) registrada(s){spot.total_captures >= 3 ? ' — atividade recente' : ''}
                </span>
              </div>
            )}

            {/* Infrastructure */}
            {hasInfra && (
              <div>
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Estrutura disponível</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(INFRA_ICONS).map(([key, { icon: Icon, label }]) => {
                    if (!infra[key]) return null
                    return (
                      <span key={key} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-300"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <Icon size={12} className="text-cyan-400" />
                        {label}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Contact info for partners */}
            {spot.is_resort && spot.phone && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
              >
                <Phone size={14} className="text-purple-400" />
                <span className="text-[12px] font-bold text-gray-300">{spot.phone}</span>
              </div>
            )}

            {/* Active highlight */}
            {spot.resort_active_highlight && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <span className="text-amber-400 text-[11px] font-bold">
                  🔥 {spot.resort_active_highlight}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 border-t border-white/5 p-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleRoute}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              style={{
                background: `${pinColor}15`,
                color: pinColor,
                border: `1px solid ${pinColor}30`,
              }}
              aria-label={`Traçar rota para ${spot.title}`}
              title="Traçar rota"
            >
              <Navigation size={14} /> Rota
            </button>
            <button
              onClick={handleToggleSave}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                isSaved
                  ? 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10'
                  : 'text-gray-400 border-white/10 hover:text-white hover:bg-white/5'
              }`}
              aria-label={isSaved ? `Remover ${spot.title} dos salvos` : `Salvar ${spot.title}`}
              title={isSaved ? 'Salvo' : 'Salvar'}
            >
              <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} /> Salvar
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 border border-white/10 hover:text-white hover:bg-white/5 transition-all"
              aria-label={`Compartilhar ${spot.title}`}
              title="Compartilhar"
            >
              <Share2 size={14} /> Compartilhar
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onNewCapture?.(spot.id)
                trackEvent('capture_started_from_map', { place_type: pinType })
              }}
              className="flex-1 btn-primary py-3 text-[11px] font-black flex items-center justify-center gap-2"
              aria-label={`Registrar captura em ${spot.title}`}
            >
              <Plus size={16} /> Registrar Captura
            </button>
            <button
              onClick={() => {
                const lat = spot.exact_lat ?? spot.display_lat
                const lng = spot.exact_lng ?? spot.display_lng
                window.location.href = `/explore?selectSpot=${spot.id}`
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 border border-white/10 hover:text-white hover:bg-white/5 transition-all"
              aria-label={`Ver detalhes completos de ${spot.title}`}
              title="Ver detalhes"
            >
              <ExternalLink size={14} /> Detalhes
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
