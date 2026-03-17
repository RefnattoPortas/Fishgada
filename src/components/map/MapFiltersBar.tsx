'use client'

import { useState } from 'react'
import { Filter, X, ChevronDown, Search } from 'lucide-react'

const SPECIES_COMMON = [
  'Tucunaré', 'Dourado', 'Traíra', 'Piranha', 'Pintado', 'Pirarucu',
  'Tilápia', 'Tambaqui', 'Corvina', 'Robalo', 'Bagre', 'Pirá',
]

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
}

interface MapFiltersBarProps {
  filters: MapFilters
  onChange: (filters: MapFilters) => void
  spotCount: number
}

export default function MapFiltersBar({ filters, onChange, spotCount }: MapFiltersBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [speciesSearch, setSpeciesSearch] = useState(filters.species)

  const set = (key: keyof MapFilters, val: any) =>
    onChange({ ...filters, [key]: val })

  const hasActiveFilters =
    filters.species ||
    filters.lureType ||
    filters.waterType ||
    filters.showOnlyVerified ||
    filters.showOnlyPublic

  const resetAll = () => {
    setSpeciesSearch('')
    onChange({
      species: '',
      lureType: '',
      waterType: '',
      showOnlyVerified: false,
      showOnlyPublic: false,
    })
  }

  return (
    <div
      id="map-filters"
      className="glass"
      style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 900,
        borderRadius: 14,
        minWidth: 320,
        maxWidth: 500,
        width: 'calc(100% - 140px)',
      }}
    >
      {/* Barra principal */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Busca por espécie */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            id="filter-species"
            className="input"
            placeholder="Buscar espécie..."
            value={speciesSearch}
            onChange={e => {
              setSpeciesSearch(e.target.value)
              set('species', e.target.value)
            }}
            style={{ paddingLeft: 32, minHeight: 38, fontSize: 13 }}
          />
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
            borderColor: hasActiveFilters ? 'var(--color-accent-primary)' : 'var(--color-border)',
            color: hasActiveFilters ? 'var(--color-accent-primary)' : undefined,
            position: 'relative',
          }}
        >
          <Filter size={14} />
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
            <X size={16} color="var(--color-text-muted)" />
          </button>
        )}
      </div>

      {/* Atalhos de espécies comuns */}
      <div style={{ paddingInline: 14, paddingBottom: 8, display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {SPECIES_COMMON.map(sp => (
          <button
            key={sp}
            onClick={() => { setSpeciesSearch(sp); set('species', sp) }}
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: filters.species === sp ? 'var(--color-accent-primary)' : 'var(--color-border)',
              background: filters.species === sp ? 'var(--color-accent-glow)' : 'transparent',
              color: filters.species === sp ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            {sp}
          </button>
        ))}
      </div>

      {/* Filtros avançados expandíveis */}
      {isExpanded && (
        <div className="fade-in" style={{ padding: '0 14px 14px', borderTop: '1px solid var(--color-border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Tipo de Isca */}
            <div>
              <label className="label" style={{ marginBottom: 6 }}>🎣 Isca mais eficiente</label>
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
              <label className="label" style={{ marginBottom: 6 }}>💧 Tipo de água</label>
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
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'showOnlyVerified', label: '✓ Só verificados' },
              { key: 'showOnlyPublic',   label: '👁️ Só públicos' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => set(opt.key as keyof MapFilters, !filters[opt.key as keyof MapFilters])}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: filters[opt.key as keyof MapFilters] ? 'var(--color-accent-primary)' : 'var(--color-border)',
                  background: filters[opt.key as keyof MapFilters] ? 'var(--color-accent-glow)' : 'transparent',
                  color: filters[opt.key as keyof MapFilters] ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contagem de resultados */}
      <div style={{ padding: '6px 14px 10px', borderTop: isExpanded ? '1px solid var(--color-border)' : 'none' }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {spotCount} ponto{spotCount !== 1 ? 's' : ''} {hasActiveFilters ? 'encontrado(s)' : 'no mapa'}
        </span>
      </div>
    </div>
  )
}
