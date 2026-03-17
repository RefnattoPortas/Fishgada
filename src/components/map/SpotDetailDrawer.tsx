'use client'

import { useState } from 'react'
import { X, MapPin, Fish, Award, Lock, Users, Eye, EyeOff, Star, Share2, Check } from 'lucide-react'
import type { SpotMapView } from '@/types/database'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const LURE_LABELS: Record<string, { label: string; emoji: string }> = {
  topwater:     { label: 'Superfície',    emoji: '🦟' },
  mid_water:    { label: 'Meia-água',     emoji: '🐟' },
  bottom:       { label: 'Fundo',         emoji: '⚓' },
  jig:          { label: 'Jig',           emoji: '⚡' },
  soft_plastic: { label: 'Soft Plastic',  emoji: '🐛' },
  crankbait:    { label: 'Crankbait',     emoji: '🏃' },
  spinnerbait:  { label: 'Spinnerbait',   emoji: '✨' },
  natural_bait: { label: 'Isca Natural',  emoji: '🪱' },
  fly:          { label: 'Mosca',         emoji: '🪰' },
  other:        { label: 'Outro',         emoji: '🎣' },
}

const WATER_LABELS: Record<string, string> = {
  river:     '🌊 Rio',
  lake:      '🏞️ Lago',
  reservoir: '🏗️ Represa',
  sea:       '🌊 Mar',
  estuary:   '🌿 Estuário',
  other:     '💧 Outro',
}

const MOON_EMOJIS: Record<string, string> = {
  new: '🌑', waxing_crescent: '🌒', first_quarter: '🌓', waxing_gibbous: '🌔',
  full: '🌕', waning_gibbous: '🌖', last_quarter: '🌗', waning_crescent: '🌘',
}

interface SpotDetailDrawerProps {
  spot: SpotMapView | null
  userCaptureCount?: number  // capturas do usuário logado (para unlock comunitário)
  isOpen: boolean
  onClose: () => void
  onNewCapture?: (spotId: string) => void
  onVerify?: (spotId: string) => void
}

export default function SpotDetailDrawer({
  spot,
  userCaptureCount = 0,
  isOpen,
  onClose,
  onNewCapture,
  onVerify,
}: SpotDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'captures' | 'setup'>('info')
  const [verified, setVerified] = useState(false)

  if (!spot) return null

  // Regra de acesso ao pin exato
  const isCommunity = spot.privacy_level === 'community'
  const canSeeExact = !isCommunity || userCaptureCount >= (spot.community_unlock_captures || 5)
  const capturesNeeded = (spot.community_unlock_captures || 5) - userCaptureCount

  const lureInfo = spot.latest_lure_type
    ? LURE_LABELS[spot.latest_lure_type]
    : null

  return (
    <>
      {/* Overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        id="spot-detail-drawer"
        className="glass-elevated flex flex-col slide-in-right"
        style={{
          width: 'var(--drawer-width)',
          minWidth: 'var(--drawer-width)',
          height: '100%',
          borderLeft: '1px solid var(--color-border)',
          overflow: 'hidden',
          position: 'relative',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header do Drawer */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {/* Badge de privacidade */}
                {spot.privacy_level === 'public' && (
                  <span className="badge badge-green"><Eye size={10} /> Público</span>
                )}
                {spot.privacy_level === 'community' && (
                  <span className="badge badge-amber"><Users size={10} /> Comunitário</span>
                )}
                {spot.privacy_level === 'private' && (
                  <span className="badge badge-red"><Lock size={10} /> Privado</span>
                )}
                {spot.is_verified && (
                  <span className="badge badge-blue"><Check size={10} /> Verificado</span>
                )}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2, marginBottom: 4 }}>
                {spot.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 12 }}>
                <MapPin size={12} />
                <span>
                  {spot.water_type ? WATER_LABELS[spot.water_type] || spot.water_type : 'Tipo de água não informado'}
                </span>
                <span>·</span>
                <span>{format(new Date(spot.created_at), "MMM 'de' yyyy", { locale: ptBR })}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 36, height: 36,
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={16} color="var(--color-text-secondary)" />
            </button>
          </div>

          {/* Aviso de Fuzzing para spot comunitário */}
          {isCommunity && !canSeeExact && (
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <EyeOff size={14} color="#f59e0b" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                  Localização Protegida
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Este é um ponto comunitário com localização "fuzzed".
                Registre mais <strong style={{ color: '#f59e0b' }}>{capturesNeeded} captura{capturesNeeded !== 1 ? 's' : ''}</strong> para
                revelar a localização exata.
              </p>
              <div style={{ marginTop: 8, height: 4, background: 'var(--color-border)', borderRadius: 2 }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (userCaptureCount / (spot.community_unlock_captures || 5)) * 100)}%`,
                  background: '#f59e0b',
                  borderRadius: 2,
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          )}

          {/* Coordenadas (apenas se tiver acesso) */}
          {canSeeExact && (
            <div style={{ padding: '8px 12px', background: 'var(--color-bg-secondary)', borderRadius: 8, marginBottom: 12, fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
              📍 {spot.exact_lat?.toFixed(6)}, {spot.exact_lng?.toFixed(6)}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 0, borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
            {[
              { key: 'info',     label: 'Informações' },
              { key: 'setup',    label: '🏆 Setup da Vitória' },
              { key: 'captures', label: `🎣 ${spot.total_captures} capturas` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: activeTab === tab.key ? 700 : 400,
                  background: activeTab === tab.key ? 'var(--color-accent-glow)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo do Tab */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* TAB: INFORMAÇÕES */}
          {activeTab === 'info' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {spot.description && (
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {spot.description}
                </p>
              )}

              {/* Stats rápidos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-accent-primary)' }}>
                    {spot.total_captures || 0}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>captura(s)</p>
                </div>
                <div className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>
                    {spot.verification_count || 0}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>verificações</p>
                </div>
              </div>

              {/* Autor */}
              <div className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--color-accent-glow)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>
                  {spot.owner_avatar
                    ? <img src={spot.owner_avatar} alt="" style={{ width: '100%', borderRadius: '50%' }} />
                    : '🎣'
                  }
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {spot.owner_name || 'Pescador anônimo'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Criou este ponto</p>
                </div>
              </div>

              {/* Botão de verificar */}
              <button
                onClick={() => { setVerified(true); onVerify?.(spot.id) }}
                disabled={verified}
                className="btn-secondary"
                style={{ width: '100%', opacity: verified ? 0.6 : 1 }}
              >
                <Award size={16} color={verified ? 'var(--color-accent-primary)' : undefined} />
                {verified ? 'Verificado por você! ✓' : 'Verificar este ponto'}
              </button>
            </div>
          )}

          {/* TAB: SETUP DA VITÓRIA */}
          {activeTab === 'setup' && (
            <div className="fade-in">
              <div
                style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(0,212,170,0.1), rgba(14,165,233,0.05))',
                  border: '1px solid rgba(0,212,170,0.2)',
                  borderRadius: 14,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Star size={16} color="#f59e0b" fill="#f59e0b" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                    Setup mais recente neste ponto
                  </span>
                </div>

                {lureInfo ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {/* Isca */}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="label" style={{ color: 'var(--color-text-muted)' }}>Isca</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--color-bg-card)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: 24 }}>{lureInfo.emoji}</span>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                            {lureInfo.label}
                          </p>
                          {spot.latest_lure_model && (
                            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              {spot.latest_lure_model}
                            </p>
                          )}
                          {spot.latest_lure_color && (
                            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                              🎨 {spot.latest_lure_color}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 24 }}>
                    <p style={{ fontSize: 32, marginBottom: 8 }}>🎣</p>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      Nenhum setup registrado ainda.<br />
                      Seja o primeiro a compartilhar!
                    </p>
                  </div>
                )}
              </div>

              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                Registre uma captura neste ponto para contribuir com o setup.
              </p>
            </div>
          )}

          {/* TAB: CAPTURAS */}
          {activeTab === 'captures' && (
            <div className="fade-in">
              {spot.total_captures === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <p style={{ fontSize: 40, marginBottom: 12 }}>🎣</p>
                  <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                    Nenhuma captura ainda
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Seja o primeiro pescador a registrar uma captura neste ponto!
                  </p>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: 16 }}>
                  <p>Veja as capturas detalhadas na seção de capturas</p>
                  <p style={{ marginTop: 8, color: 'var(--color-accent-primary)', fontWeight: 600 }}>
                    {spot.total_captures} captura(s) registrada(s)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — Botão "Novo Log" */}
        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--color-border)' }}>
          <button
            id="btn-new-capture"
            className="btn-primary btn-mobile-lg"
            style={{ width: '100%' }}
            onClick={() => onNewCapture?.(spot.id)}
          >
            <Fish size={20} />
            Registrar Captura Aqui
          </button>
        </div>
      </aside>
    </>
  )
}
