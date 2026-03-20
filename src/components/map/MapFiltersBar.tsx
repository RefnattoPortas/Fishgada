'use client'

import { useState } from 'react'
import { Filter, X, ChevronDown, Search, Menu } from 'lucide-react'
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

interface MapFiltersBarProps {
  filters: MapFilters
  onChange: (filters: MapFilters) => void
  spotCount: number
  user: any
  theme?: 'dark' | 'light'
}

export default function MapFiltersBar({ filters, onChange, spotCount, user, theme = 'light' }: MapFiltersBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [speciesSearch, setSpeciesSearch] = useState(filters.species)

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
            list="filter-species-list"
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
          <datalist id="filter-species-list">
            {SPECIES_COMMON.map(sp => (
              <option key={sp} value={sp} />
            ))}
          </datalist>
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
           // Strip the scientific name if present in the chip for brevity
           const label = sp.includes('(') ? sp.split(' (')[0] : sp
           return (
            <button
              key={sp}
              onClick={() => { setSpeciesSearch(sp); set('species', sp) }}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: filters.species === sp ? '#00d4aa88' : (theme === 'light' ? 'rgba(0,0,0,0.06)' : 'var(--color-border)'),
                background: filters.species === sp 
                  ? (theme === 'light' ? '#00d4aa22' : 'var(--color-accent-glow)') 
                  : (theme === 'light' ? 'rgba(0,0,0,0.04)' : 'transparent'),
                color: filters.species === sp 
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
              { key: 'showOnlyResorts',  label: '🏡 Pesqueiros' },
              { key: 'hidePublic',       label: '🔒 Ocultar Públicos', isPro: true },
            ].map(opt => {
              const isActive = (filters as any)[opt.key]
              const isProUser = (user as any)?.profile?.subscription_tier === 'pro' || (user as any)?.profile?.subscription_tier === 'partner'
              
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
                        ? '#00d4aa88' 
                        : (theme === 'light' ? 'rgba(0,0,0,0.06)' : 'var(--color-border)'),
                    background: isActive 
                        ? (theme === 'light' ? '#00d4aa22' : 'var(--color-accent-glow)') 
                        : (theme === 'light' ? 'rgba(0,0,0,0.04)' : 'transparent'),
                    color: isActive 
                        ? '#00b38f' 
                        : (theme === 'light' ? '#6b7280' : 'var(--color-text-secondary)'),
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: opt.isPro && !isProUser ? 'not-allowed' : 'pointer',
                    opacity: opt.isPro && !isProUser ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
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

      {/* Contagem de resultados */}
      <div style={{ padding: '6px 14px 10px', borderTop: isExpanded ? `1px solid ${theme === 'light' ? '#e5e7eb' : 'var(--color-border)'}` : 'none' }}>
        <span style={{ fontSize: 11, color: theme === 'light' ? '#6b7280' : 'var(--color-text-muted)' }}>
          {spotCount} ponto{spotCount !== 1 ? 's' : ''} {hasActiveFilters ? 'encontrado(s)' : 'no mapa'}
        </span>
      </div>
    </div>
  )
}
