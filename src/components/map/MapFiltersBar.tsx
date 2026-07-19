'use client'

import { useState, useEffect, useMemo } from 'react'
import { Filter, X, Search, Menu, Flame, BellOff, Bell, ChevronRight, MapPin, Fish, Clock, Star } from 'lucide-react'
import { ALL_SPECIES as SPECIES_COMMON } from '@/lib/data/species'
import { trackEvent } from '@/lib/analytics'

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

const PRIVACY_TYPES = [
  { value: '', label: 'Todos os tipos' },
  { value: 'public', label: '👁️ Público' },
  { value: 'community', label: '🤝 Comunitário' },
  { value: 'private', label: '🔒 Privado' },
  { value: 'partner', label: '👑 Parceiro' },
]

export interface MapFilters {
  species: string
  lureType: string
  waterType: string
  showOnlyVerified: boolean
  showOnlyPublic: boolean
  showOnlyResorts: boolean
  hidePublic: boolean
  privacyType: string
  maxDistance: number
  showOnlyActive: boolean
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
  partnerCount?: number
  activeCount?: number
  speciesCount?: number
}

export default function MapFiltersBar({
  filters, onChange, spotCount, user, theme = 'light',
  highlights = [], onHighlightClick,
  partnerCount, activeCount, speciesCount,
}: MapFiltersBarProps) {
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

  const set = (key: keyof MapFilters, val: any) => {
    onChange({ ...filters, [key]: val })
    if (key !== 'maxDistance') {
      trackEvent('filter_applied', { filter_count: activeFilterChips.length, [key]: String(val) })
    }
  }

  const hasActiveFilters =
    filters.species || filters.lureType || filters.waterType ||
    filters.showOnlyVerified || filters.showOnlyPublic ||
    filters.showOnlyResorts || filters.hidePublic ||
    filters.privacyType || filters.showOnlyActive

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = []
    if (filters.species) chips.push({ key: 'species', label: `🐟 ${filters.species.split(' (')[0]}` })
    if (filters.lureType) {
      const lure = LURE_TYPES.find(l => l.value === filters.lureType)
      if (lure) chips.push({ key: 'lureType', label: lure.label })
    }
    if (filters.waterType) {
      const water = WATER_TYPES.find(w => w.value === filters.waterType)
      if (water) chips.push({ key: 'waterType', label: water.label })
    }
    if (filters.showOnlyVerified) chips.push({ key: 'showOnlyVerified', label: '✓ Verificados' })
    if (filters.showOnlyResorts) chips.push({ key: 'showOnlyResorts', label: '🏡 Pesqueiros' })
    if (filters.hidePublic) chips.push({ key: 'hidePublic', label: '🔒 Sem públicos' })
    if (filters.privacyType) {
      const p = PRIVACY_TYPES.find(pt => pt.value === filters.privacyType)
      if (p) chips.push({ key: 'privacyType', label: p.label })
    }
    if (filters.showOnlyActive) chips.push({ key: 'showOnlyActive', label: '⚡ Ativos' })
    return chips
  }, [filters])

  const removeChip = (key: string) => {
    if (key === 'species') { setSpeciesSearch(''); set('species', '') }
    else if (key === 'lureType') set('lureType', '')
    else if (key === 'waterType') set('waterType', '')
    else if (key === 'privacyType') set('privacyType', '')
    else set(key as keyof MapFilters, false)
  }

  const resetAll = () => {
    setSpeciesSearch('')
    onChange({
      species: '', lureType: '', waterType: '',
      showOnlyVerified: false, showOnlyPublic: false,
      showOnlyResorts: false, hidePublic: false,
      privacyType: '', maxDistance: 100, showOnlyActive: false,
    })
  }

  const contextualCount = useMemo(() => {
    const parts: string[] = []
    parts.push(`${spotCount} local(is) encontrado(s)`)
    if (speciesCount && speciesCount > 0 && !filters.species) parts.push(`${speciesCount} com a espécie`)
    if (activeCount && activeCount > 0) parts.push(`${activeCount} ativo(s)`)
    if (partnerCount && partnerCount > 0) parts.push(`${partnerCount} parceiro(s)`)
    return parts.join(' · ')
  }, [spotCount, speciesCount, activeCount, partnerCount, filters.species])

  const isProUser = user?.profile?.subscription_tier === 'pro' || user?.profile?.subscription_tier === 'partner'

  return (
    <div
      id="map-filters"
      className="glass absolute z-[900] rounded-[14px] max-w-[500px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] md:w-[calc(100%-140px)] md:min-w-[320px]"
      style={{
        top: 'calc(16px + env(safe-area-inset-top, 0px))',
        background: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : undefined,
        borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : undefined,
        color: theme === 'light' ? '#111827' : undefined,
        boxShadow: theme === 'light' ? '0 8px 32px rgba(0, 0, 0, 0.1)' : undefined,
      }}
      role="search"
      aria-label="Filtros do mapa"
    >
      {/* Main bar */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          className="md:hidden flex items-center justify-center rounded-[10px] bg-[#0a0f1a] text-white border border-[var(--color-border-strong)] hover:bg-[#121e30] transition-colors"
          style={{ minWidth: 42, width: 42, height: 42 }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            window.dispatchEvent(new CustomEvent('toggleMobileMenu'))
          }}
          aria-label="Abrir menu de navegação"
          title="Menu"
        >
          <Menu size={20} />
        </button>

        {/* Species search */}
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
              if (e.target.value) trackEvent('species_searched', { species: e.target.value })
            }}
            style={{
              paddingLeft: 32, minHeight: 38, fontSize: 13,
              background: theme === 'light' ? 'rgba(0,0,0,0.04)' : undefined,
              borderColor: theme === 'light' ? 'rgba(0,0,0,0.06)' : undefined,
              color: theme === 'light' ? '#111827' : undefined,
            }}
            aria-label="Buscar por espécie de peixe"
          />
          {isMounted && (
            <datalist id="filter-species-list">
              {[...SPECIES_COMMON].map(sp => sp.split(' (')[0]).sort().map(sp => (
                <option key={sp} value={sp} />
              ))}
            </datalist>
          )}
        </div>

        {/* Toggle filters */}
        <button
          id="btn-toggle-filters"
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-secondary"
          style={{
            minHeight: 38, padding: '0 12px', fontSize: 13, position: 'relative',
            background: theme === 'light' ? (hasActiveFilters ? '#00d4aa15' : 'rgba(0,0,0,0.04)') : undefined,
            color: hasActiveFilters ? '#00b38f' : (theme === 'light' ? '#374151' : 'var(--color-text-secondary)'),
            borderColor: hasActiveFilters ? (theme === 'light' ? '#00d4aa88' : 'var(--color-accent-primary)') : (theme === 'light' ? 'rgba(0,0,0,0.06)' : 'var(--color-border)'),
            borderStyle: 'solid', borderWidth: 1,
          }}
          aria-label={isExpanded ? 'Recolher filtros' : 'Expandir filtros'}
          title="Filtros"
        >
          <Filter size={14} color={hasActiveFilters ? '#00b38f' : (theme === 'light' ? '#6b7280' : undefined)} />
          Filtros
          {hasActiveFilters && (
            <span style={{
              position: 'absolute', top: -6, right: -6,
              width: 16, height: 16, background: 'var(--color-accent-primary)',
              color: '#000', borderRadius: '50%', fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{activeFilterChips.length}</span>
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
            aria-label="Limpar todos os filtros"
          >
            <X size={16} color={theme === 'light' ? '#4b5563' : "var(--color-text-muted)"} />
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilterChips.length > 0 && (
        <div style={{ padding: '0 14px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {activeFilterChips.map(chip => (
            <span
              key={chip.key}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px 3px 10px', borderRadius: 14,
                fontSize: 10, fontWeight: 600,
                background: theme === 'light' ? '#00d4aa15' : 'var(--color-accent-glow)',
                color: '#00b38f',
                border: `1px solid ${theme === 'light' ? '#00d4aa44' : 'rgba(0,212,170,0.3)'}`,
              }}
            >
              {chip.label}
              <button
                onClick={() => removeChip(chip.key)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', lineHeight: 0 }}
                aria-label={`Remover filtro ${chip.label}`}
              >
                <X size={10} color="#00b38f" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Species quick chips */}
      <div style={{ paddingInline: 14, paddingBottom: 8, display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {SPECIES_COMMON.slice(0, 15).map(sp => {
          const label = sp.split(' (')[0]
          return (
            <button
              key={sp}
              onClick={() => { setSpeciesSearch(label); onChange({ ...filters, species: label }) }}
              style={{
                padding: '4px 10px', borderRadius: 20, border: '1px solid',
                borderColor: filters.species === label ? '#00d4aa88' : (theme === 'light' ? 'rgba(0,0,0,0.06)' : 'var(--color-border)'),
                background: filters.species === label
                  ? (theme === 'light' ? '#00d4aa22' : 'var(--color-accent-glow)')
                  : (theme === 'light' ? 'rgba(0,0,0,0.04)' : 'transparent'),
                color: filters.species === label ? '#00b38f' : (theme === 'light' ? '#4b5563' : 'var(--color-text-muted)'),
                fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
              aria-label={`Filtrar por ${label}`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="fade-in" style={{ padding: '0 14px 14px', borderTop: `1px solid ${theme === 'light' ? '#e5e7eb' : 'var(--color-border)'}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Lure Type */}
            <div>
              <label className="label" style={{ color: theme === 'light' ? '#374151' : undefined }}>🎣 Isca mais eficiente</label>
              <select
                id="filter-lure-type"
                className="select"
                value={filters.lureType}
                onChange={e => set('lureType', e.target.value)}
                style={{ minHeight: 40 }}
                aria-label="Filtrar por tipo de isca"
              >
                {LURE_TYPES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Water Type */}
            <div>
              <label className="label" style={{ color: theme === 'light' ? '#374151' : undefined }}>💧 Tipo de água</label>
              <select
                id="filter-water-type"
                className="select"
                value={filters.waterType}
                onChange={e => set('waterType', e.target.value)}
                style={{ minHeight: 40 }}
                aria-label="Filtrar por tipo de água"
              >
                {WATER_TYPES.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Privacy type filter */}
          <div>
            <label className="label" style={{ color: theme === 'light' ? '#374151' : undefined }}>📋 Tipo de local</label>
            <select
              className="select"
              value={filters.privacyType}
              onChange={e => set('privacyType', e.target.value)}
              style={{ minHeight: 40 }}
              aria-label="Filtrar por tipo de local"
            >
              {PRIVACY_TYPES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'showOnlyVerified', label: '✓ Só verificados' },
              { key: 'showOnlyResorts', label: '🏡 Pesqueiros', activeColor: '#a855f7' },
              { key: 'showOnlyActive', label: '⚡ Só ativos' },
              { key: 'hidePublic', label: '🔒 Ocultar Públicos', isPro: true },
            ].map(opt => {
              const isActive = (filters as any)[opt.key]
              const color = (opt as any).activeColor || '#00b38f'

              return (
                <button
                  key={opt.key}
                  disabled={opt.isPro && !isProUser}
                  onClick={() => set(opt.key as keyof MapFilters, !isActive)}
                  className="transition-all"
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px solid',
                    borderColor: isActive ? color : (theme === 'light' ? 'rgba(0,0,0,0.06)' : 'var(--color-border)'),
                    background: isActive ? (theme === 'light' ? `${color}15` : 'var(--color-accent-glow)') : (theme === 'light' ? 'rgba(0,0,0,0.04)' : 'transparent'),
                    color: isActive ? color : (theme === 'light' ? '#6b7280' : 'var(--color-text-secondary)'),
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
                    cursor: opt.isPro && !isProUser ? 'not-allowed' : 'pointer',
                    opacity: opt.isPro && !isProUser ? 0.4 : 1,
                  }}
                  aria-label={opt.isPro && !isProUser ? `${opt.label} (recurso PRO)` : opt.label}
                  aria-pressed={isActive}
                  role="switch"
                >
                  {opt.label}
                  {opt.isPro && !isProUser && <span className="text-[8px] bg-amber-500 text-dark px-1 rounded-sm font-black">PRO</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Context Count + Highlights */}
      <div style={{ padding: '6px 14px 10px', borderTop: isExpanded ? `1px solid ${theme === 'light' ? '#e5e7eb' : 'var(--color-border)'}` : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: theme === 'light' ? '#6b7280' : 'var(--color-text-muted)' }}>
            {contextualCount}
          </span>
          {highlights.length > 0 && (
            <button
              onClick={toggleMute}
              title={muted ? 'Ativar notificações' : 'Silenciar notificações'}
              aria-label={muted ? 'Ativar notificações de destaques' : 'Silenciar notificações de destaques'}
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

        {/* Highlight banner */}
        {!muted && highlights.length > 0 && (() => {
          const h = highlights[activeHighlightIdx % highlights.length]
          if (!h) return null
          return (
            <button
              key={h.id}
              onClick={() => onHighlightClick?.(h.id)}
              style={{
                marginTop: 8, width: '100%', display: 'flex', alignItems: 'center',
                gap: 10, padding: '8px 12px', borderRadius: 12, border: '1px solid',
                borderColor: theme === 'light' ? '#a855f733' : '#a855f744',
                background: theme === 'light' ? '#a855f70a' : 'rgba(168, 85, 247, 0.08)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s ease',
              }}
              aria-label={`Destaque: ${h.highlight} — ${h.title}`}
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
