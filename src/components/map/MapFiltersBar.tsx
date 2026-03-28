'use client'

import { useState, useEffect } from 'react'
import { Filter, X, ChevronDown, Search, Menu, Flame, BellOff, Bell, ChevronRight } from 'lucide-react'
import { ALL_SPECIES as SPECIES_COMMON } from '@/lib/data/species'


const LURE_TYPES = [
  { value: '', label: 'Todos os tipos' },
  { value: 'topwater',     label: '🦟 Superfície' },
  { value: 'mid_water',    label: '🐟 Meia-água' },
  { value: 'bottom',       label: '⚓ Fundo' },
  { value: 'jig',          label: '⚡ Jig' },
  { value: 'soft_plastic', label: '🐛 Soft Plastic' },
  { value: 'crankbait',    label: '🏃 Crankbait' },
  { value: 'natural_bait', label: '🪱 Isca Natural' },
  { value: 'fly',          label: '🪰 Mosca' },
]

const WATER_TYPES = [
  { value: '', label: 'Qualquer tipo de água' },
  { value: 'river',     label: '🌊 Rio' },
  { value: 'lake',      label: '🏞️ Lago' },
  { value: 'reservoir', label: '🏗️ Represa' },
  { value: 'sea',       label: '🌊 Mar' },
]

export interface MapFilters {
  species: string
  lureType: string
  waterType: string
  showOnlyVerified: boolean
  showOnlyPublic: boolean
  showOnlyResorts: boolean
  hidePublic: boolean
}

export interface ResortHighlight {
  id: string
  title: string
  highlight: string
}

interface MapFiltersBarProps {
  filters: MapFilters
  onChange: (filters: MapFilters) => void
  spotCount: number
  user: any
  theme?: 'dark' | 'light'
  highlights?: ResortHighlight[]
  onHighlightClick?: (id: string) => void
}

export default function MapFiltersBar({ filters, onChange, spotCount, user, theme = 'light', highlights = [], onHighlightClick }: MapFiltersBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [speciesSearch, setSpeciesSearch] = useState(filters.species)
  const [isMounted, setIsMounted] = useState(false)
  const [muted, setMuted] = useState(false)
  const [activeHighlightIdx, setActiveHighlightIdx] = useState(0)

  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem('fishgada_mute_highlights')
    if (saved === 'true') setMuted(true)
  }, [])

  // Rotação automática das notificações a cada 5s
  useEffect(() => {
    if (highlights.length <= 1) return
    const interval = setInterval(() => {
      setActiveHighlightIdx(prev => (prev + 1) % highlights.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [highlights.length])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    localStorage.setItem('fishgada_mute_highlights', String(next))
  }


  const set = (key: keyof MapFilters, val: any) =>
    onChange({ ...filters, [key]: val })

  const hasActiveFilters =
    filters.species ||
    filters.lureType ||
    filters.waterType ||
    filters.showOnlyVerified ||
    filters.showOnlyPublic ||
    filters.showOnlyResorts ||
    filters.hidePublic

  const resetAll = () => {
    setSpeciesSearch('')
    onChange({
      species: '',
      lureType: '',
      waterType: '',
      showOnlyVerified: false,
      showOnlyPublic: false,
      showOnlyResorts: false,
      hidePublic: false,
    })
  }

  return (
    <div
      id="map-filters"
      className="glass absolute z-[900] rounded-[14px] max-w-[500px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] md:w-[calc(100%-140px)] md:min-w-[320px]"
      style={{
        top: 'calc(16px + env(safe-area-inset-top, 0px))',
        // Se for tema claro, sobrepor o glass padrão com branco
        background: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : undefined,
        borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : undefined,
        color: theme === 'light' ? '#111827' : undefined,
        boxShadow: theme === 'light' ? '0 8px 32px rgba(0, 0, 0, 0.1)' : undefined,
      }}
    >
      {/* Barra principal */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        
        {/* Mobile Sidebar Toggle Button injected into MapFiltersBar */}
        <button
          type="button"
          className="md:hidden flex items-center justify-center rounded-[10px] bg-[#0a0f1a] text-white border border-[var(--color-border-strong)] hover:bg-[#121e30] transition-colors"
          style={{ minWidth: 42, width: 42, height: 42 }}
          onClick={(e) => { 
            e.preventDefault(); 
            e.stopPropagation(); 
            window.dispatchEvent(new CustomEvent('toggleMobileMenu')); 
          }}
        >
          <Menu size={20} />
        </button>

        {/* Busca por espécie */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} color={theme === 'light' ? '#6b7280' : "var(--color-text-muted)"} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            id="filter-species"
            className="input"
            list={isMounted ? "filter-species-list" : undefined}
            placeholder="Buscar espécie..."
            value={speciesSearch}
            onChange={e => {
              setSpeciesSearch(e.target.value)
              set('species', e.target.value)
            }}
            style={{ 
              paddingLeft: 32, 
              minHeight: 38, 
              fontSize: 13,
              background: theme === 'light' ? 'rgba(0,0,0,0.04)' : undefined,
              borderColor: theme === 'light' ? 'rgba(0,0,0,0.06)' : undefined,
              color: theme === 'light' ? '#111827' : undefined,
            }}
          />
          {isMounted && (
            <datalist id="filter-species-list">
              {[...SPECIES_COMMON].map(sp => sp.split(' (')[0]).sort().map(sp => (
                <option key={sp} value={sp} />
              ))}
            </datalist>
          )}
        </div>

        {/* Toggle filtros avançados */}
        <button
          id="btn-toggle-filters"
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-secondary"
          style={{
            minHeight: 38,
            padding: '0 12px',
            fontSize: 13,
            position: 'relative',
            background: theme === 'light' ? (hasActiveFilters ? '#00d4aa15' : 'rgba(0,0,0,0.04)') : undefined,
            color: hasActiveFilters ? '#00b38f' : (theme === 'light' ? '#374151' : 'var(--color-text-secondary)'),
            borderColor: hasActiveFilters ? (theme === 'light' ? '#00d4aa88' : 'var(--color-accent-primary)') : (theme === 'light' ? 'rgba(0,0,0,0.06)' : 'var(--color-border)'),
            borderStyle: 'solid',
            borderWidth: 1,
          }}
        >
          <Filter size={14} color={hasActiveFilters ? '#00b38f' : (theme === 'light' ? '#6b7280' : undefined)} />
          Filtros
          {hasActiveFilters && (
            <span style={{
              position: 'absolute', top: -6, right: -6,
              width: 16, height: 16, background: 'var(--color-accent-primary)',
              color: '#000', borderRadius: '50%', fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>!</span>
          )}
        </button>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={resetAll}
            style={{
              width: 32, height: 38, background: 'transparent',
              border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Limpar filtros"
          >
            <X size={16} color={theme === 'light' ? '#4b5563' : "var(--color-text-muted)"} />
          </button>
        )}
      </div>

      {/* Atalhos de espécies comuns */}
      <div style={{ paddingInline: 14, paddingBottom: 8, display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {SPECIES_COMMON.slice(0, 15).map(sp => {
           const label = sp.split(' (')[0]
           return (
            <button
              key={sp}
              onClick={() => { setSpeciesSearch(label); set('species', label) }}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: filters.species === label ? '#00d4aa88' : (theme === 'light' ? 'rgba(0,0,0,0.06)' : 'var(--color-border)'),
                background: filters.species === label 
                  ? (theme === 'light' ? '#00d4aa22' : 'var(--color-accent-glow)') 
                  : (theme === 'light' ? 'rgba(0,0,0,0.04)' : 'transparent'),
                color: filters.species === label 
                  ? '#00b38f' 
                  : (theme === 'light' ? '#4b5563' : 'var(--color-text-muted)'),
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Filtros avançados expandíveis */}
      {isExpanded && (
        <div className="fade-in" style={{ padding: '0 14px 14px', borderTop: `1px solid ${theme === 'light' ? '#e5e7eb' : 'var(--color-border)'}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Tipo de Isca */}
            <div>
              <label className="label" style={{ marginBottom: 6, color: theme === 'light' ? '#374151' : undefined }}>🎣 Isca mais eficiente</label>
              <select
                id="filter-lure-type"
                className="select"
                value={filters.lureType}
                onChange={e => set('lureType', e.target.value)}
                style={{ minHeight: 40 }}
              >
                {LURE_TYPES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Tipo de Água */}
            <div>
              <label className="label" style={{ marginBottom: 6, color: theme === 'light' ? '#374151' : undefined }}>💧 Tipo de água</label>
              <select
                id="filter-water-type"
                className="select"
                value={filters.waterType}
                onChange={e => set('waterType', e.target.value)}
                style={{ minHeight: 40 }}
              >
                {WATER_TYPES.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'showOnlyVerified', label: '✓ Só verificados' },
              { key: 'showOnlyPublic',   label: '👁️ Só públicos' },
              { key: 'showOnlyResorts',  label: '🏡 Pesqueiros', activeColor: '#a855f7' },
              { key: 'hidePublic',       label: '🔒 Ocultar Públicos', isPro: true },
            ].map(opt => {
              const isActive = (filters as any)[opt.key]
              const isProUser = (user as any)?.profile?.subscription_tier === 'pro' || (user as any)?.profile?.subscription_tier === 'partner'
              const color = (opt as any).activeColor || (theme === 'light' ? '#00b38f' : 'var(--color-accent-primary)')
              
              return (
                <button
                  key={opt.key}
                  disabled={opt.isPro && !isProUser}
                  onClick={() => set(opt.key as keyof MapFilters, !isActive)}
                  className="transition-all"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: isActive 
                        ? color 
                        : (theme === 'light' ? 'rgba(0,0,0,0.06)' : 'var(--color-border)'),
                    background: isActive 
                        ? (theme === 'light' ? `${color}15` : 'var(--color-accent-glow)') 
                        : (theme === 'light' ? 'rgba(0,0,0,0.04)' : 'transparent'),
                    color: isActive 
                        ? color
                        : (theme === 'light' ? '#6b7280' : 'var(--color-text-secondary)'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: opt.isPro && !isProUser ? 'not-allowed' : 'pointer',
                    opacity: opt.isPro && !isProUser ? 0.4 : 1,
                  }}
                >
                  {opt.label}
                  {opt.isPro && !isProUser && <span className="text-[8px] bg-amber-500 text-dark px-1 rounded-sm font-black">PRO</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Contagem de resultados + Notificações de Destaque */}
      <div style={{ padding: '6px 14px 10px', borderTop: isExpanded ? `1px solid ${theme === 'light' ? '#e5e7eb' : 'var(--color-border)'}` : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: theme === 'light' ? '#6b7280' : 'var(--color-text-muted)' }}>
            {spotCount} ponto{spotCount !== 1 ? 's' : ''} {hasActiveFilters ? 'encontrado(s)' : 'no mapa'}
          </span>
          {highlights.length > 0 && (
            <button 
              onClick={toggleMute}
              title={muted ? 'Ativar notificações' : 'Silenciar notificações'}
              style={{ 
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                color: muted ? (theme === 'light' ? '#9ca3af' : 'var(--color-text-muted)') : '#a855f7',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {muted ? <BellOff size={13} /> : <Bell size={13} />}
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {muted ? 'Silenciado' : `${highlights.length} aviso${highlights.length > 1 ? 's' : ''}`}
              </span>
            </button>
          )}
        </div>

        {/* Banner de Destaque do Pesqueiro */}
        {!muted && highlights.length > 0 && (() => {
          const h = highlights[activeHighlightIdx % highlights.length]
          if (!h) return null
          return (
            <button 
              key={h.id}
              onClick={() => onHighlightClick?.(h.id)}
              style={{
                marginTop: 8,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 12,
                border: '1px solid',
                borderColor: theme === 'light' ? '#a855f733' : '#a855f744',
                background: theme === 'light' ? '#a855f70a' : 'rgba(168, 85, 247, 0.08)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
              }}
            >
              <Flame size={16} style={{ color: '#a855f7', flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a855f7', lineHeight: 1, marginBottom: 3 }}>Destaque na Região</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: theme === 'light' ? '#1f2937' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.highlight} <span style={{ fontWeight: 500, color: theme === 'light' ? '#6b7280' : '#9ca3af' }}>— {h.title}</span>
                </div>
              </div>
              {highlights.length > 1 && (
                <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
                  {highlights.map((_, i) => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: i === activeHighlightIdx % highlights.length ? '#a855f7' : (theme === 'light' ? '#d1d5db' : '#374151') 
                    }} />
                  ))}
                </div>
              )}
              <ChevronRight size={14} style={{ color: '#a855f7', flexShrink: 0 }} />
            </button>
          )
        })()}
      </div>
    </div>
  )
}
