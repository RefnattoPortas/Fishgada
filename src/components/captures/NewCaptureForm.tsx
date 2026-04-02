'use client'

import { useState, useEffect } from 'react'
import { X, Fish, MapPin, Scale, Ruler, Moon, Thermometer, Wind, Cloud, Droplets, Save, Wifi, WifiOff, Camera, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { savePendingCapture } from '@/lib/offline/indexeddb'
import { getSupabaseClient } from '@/lib/supabase/client'
import { ALL_SPECIES } from '@/lib/data/species'

// Opções de selects
const LURE_TYPES = [
  { value: 'topwater',     label: '🦟 Superfície (Topwater)',   desc: 'Isca na superfície da água' },
  { value: 'mid_water',    label: '🐟 Meia-água',               desc: 'Isca em suspensão' },
  { value: 'bottom',       label: '⚓ Fundo',                   desc: 'Pesca de fundo' },
  { value: 'jig',          label: '⚡ Jig',                    desc: 'Jig head + soft' },
  { value: 'soft_plastic', label: '🐛 Soft Plastic',            desc: 'Isca macia' },
  { value: 'crankbait',    label: '🏃 Crankbait',               desc: 'Isca mergulhadora' },
  { value: 'spinnerbait',  label: '✨ Spinnerbait',             desc: 'Colher giratória' },
  { value: 'natural_bait', label: '🪱 Isca Natural',            desc: 'Minhoca, moela, etc.' },
  { value: 'fly',          label: '🪰 Mosca',                   desc: 'Pesca com mosca' },
  { value: 'other',        label: '🎣 Outra',                   desc: 'Outro tipo' },
]

const MOON_PHASES = [
  { value: 'new',             label: '🌑 Lua Nova' },
  { value: 'waxing_crescent', label: '🌒 Crescente' },
  { value: 'first_quarter',   label: '🌓 Quarto Crescente' },
  { value: 'waxing_gibbous',  label: '🌔 Gibosa Crescente' },
  { value: 'full',            label: '🌕 Lua Cheia' },
  { value: 'waning_gibbous',  label: '🌖 Gibosa Minguante' },
  { value: 'last_quarter',    label: '🌗 Quarto Minguante' },
  { value: 'waning_crescent', label: '🌘 Minguante' },
]

const WEATHER_OPTIONS = [
  { value: 'sunny',  label: '☀️ Sol' },
  { value: 'cloudy', label: '⛅ Nublado' },
  { value: 'rainy',  label: '🌧️ Chuva' },
  { value: 'windy',  label: '💨 Vento' },
  { value: 'foggy',  label: '🌫️ Neblina' },
  { value: 'stormy', label: '⛈️ Tempestade' },
]

const WATER_CLARITY = [
  { value: 'clear',  label: '💎 Limpa' },
  { value: 'murky',  label: '🌿 Turva' },
  { value: 'dirty',  label: '🟤 Suja' },
]

const TIME_OF_DAY = [
  { value: 'dawn',      label: '🌅 Amanhecer' },
  { value: 'morning',   label: '☀️ Manhã' },
  { value: 'afternoon', label: '🌤️ Tarde' },
  { value: 'dusk',      label: '🌆 Entardecer' },
  { value: 'night',     label: '🌙 Noite' },
]

interface NewCaptureFormProps {
  spotId?: string | null
  userId: string
  isOnline: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface FormData {
  // Captura
  species: string
  weight_kg: string
  length_cm: string
  is_trophy: boolean
  was_released: boolean
  is_public: boolean
  notes: string

  // Condições
  moon_phase: string
  temperature_c: string
  weather: string
  water_clarity: string
  time_of_day: string
  wind_speed_kmh: string

  // Setup
  lure_type: string
  lure_model: string
  lure_color: string
  hook_size: string
  line_lb: string
  line_type: string
}

export default function NewCaptureForm({
  spotId,
  userId,
  isOnline,
  onClose,
  onSuccess,
}: NewCaptureFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // Foto states
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [showFullPhoto, setShowFullPhoto] = useState(false)

  // Espécies Catálogo
  const [catalogSpecies, setCatalogSpecies] = useState<{nome_comum: string, tamanho_recorde_cm: number | null}[]>([])

  const [data, setData] = useState<FormData>({
    species: '',
    weight_kg: '',
    length_cm: '',
    is_trophy: false,
    was_released: true,
    is_public: true,
    notes: '',
    moon_phase: '',
    temperature_c: '',
    weather: '',
    water_clarity: '',
    time_of_day: '',
    wind_speed_kmh: '',
    lure_type: '',
    lure_model: '',
    lure_color: '',
    hook_size: '',
    line_lb: '',
    line_type: '',
  })

  // Autofetch do catálogo para autocomplete e sugestão de troféu
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const supabase = getSupabaseClient() as any
        const { data: list, error } = await supabase.from('species').select('nome_comum, tamanho_recorde_cm')
        if (list && !error) setCatalogSpecies(list)
      } catch (e) {
        console.warn('View de espécies ou conexão falhou', e)
      }
    }
    if (isOnline) fetchCatalog()
  }, [isOnline])

  // Lógica de Troféu Automático (75% do recorde sul-americano = Troféu)
  useEffect(() => {
    if (data.species && data.length_cm) {
      const sp = catalogSpecies.find(s => s.nome_comum.toLowerCase() === data.species.toLowerCase())
      if (sp && sp.tamanho_recorde_cm) {
        if (parseFloat(data.length_cm) >= (sp.tamanho_recorde_cm * 0.75)) {
          if (!data.is_trophy) {
             setData(prev => ({ ...prev, is_trophy: true }))
          }
        }
      }
    }
  }, [data.species, data.length_cm, catalogSpecies])

  const set = (key: keyof FormData, val: any) =>
    setData(prev => ({ ...prev, [key]: val }))

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!data.species) return
    
    if (userId === 'guest-user') {
      alert('Você precisa estar logado para registrar capturas!')
      return
    }
    
    // Inicia o estado de salvamento
    setSaving(true)

    // Função auxiliar para garantir UUID v4 válido mesmo sem crypto.randomUUID
    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    }

    const captureId = generateUUID()

    let finalPhotoUrl = photoPreview
    let capturePayload: any = null

    try {
      // 1. Subir a foto pro Bucket se online (com timeout)
      if (photoFile && isOnline) {
        console.log('[NewCaptureForm] Subindo foto para o Storage...')
        try {
          const supabase = getSupabaseClient() as any
          const fileExt = photoFile.name.split('.').pop()
          const fileName = `${userId}_${Date.now()}.${fileExt}`
          
          // Race entre upload e timeout de 15 segundos (fotos podem ser grandes)
          const uploadPromise = supabase.storage.from('captures').upload(fileName, photoFile)
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout storage')), 15000))
          
          const { data: uploadData, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any
          
          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage.from('captures').getPublicUrl(fileName)
            finalPhotoUrl = publicUrl 
            console.log('[NewCaptureForm] Foto subida com sucesso:', finalPhotoUrl)
          } else {
            console.warn('Erro Storage ou Timeout. Mantendo Base64 local.', uploadError)
          }
        } catch (err) {
          console.warn('Erro/Timeout no Storage. Prosseguindo com Base64.', err)
        }
      }

      capturePayload = {
        id: captureId,
        user_id: userId,
        spot_id: spotId || null,
        species: data.species,
        weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
        length_cm: data.length_cm ? parseFloat(data.length_cm) : null,
        photo_url: finalPhotoUrl,
        captured_at: new Date().toISOString(),
        moon_phase: data.moon_phase || null,
        temperature_c: data.temperature_c ? parseFloat(data.temperature_c) : null,
        weather: data.weather || null,
        notes: data.notes || null,
        is_public: data.is_public,
        created_locally_at: new Date().toISOString(),
        setup: data.lure_type ? {
          lure_type: data.lure_type || null,
          lure_model: data.lure_model || null,
          lure_color: data.lure_color || null,
          hook_size: data.hook_size || null,
          line_lb: data.line_lb ? parseFloat(data.line_lb) : null,
          line_type: data.line_type || null,
        } : undefined,
      }

      const isGuest = userId === 'guest-user'

      if (isOnline && !isGuest) {
        console.log('[NewCaptureForm] Enviando para o Supabase...')
        const supabase = getSupabaseClient() as any
        
        const result = await Promise.race([
          supabase.from('captures').insert([{
            id: captureId, // Passamos o ID gerado localmente para garantir idempotência
            user_id: userId,
            spot_id: spotId || null,
            species: data.species,
            weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
            length_cm: data.length_cm ? parseFloat(data.length_cm) : null,
            photo_url: finalPhotoUrl,
            is_trophy: data.is_trophy,
            was_released: data.was_released,
            is_public: data.is_public,
            notes: data.notes,
            moon_phase: data.moon_phase || null,
            temperature_c: data.temperature_c ? parseFloat(data.temperature_c) : null,
            weather: data.weather || null,
            water_clarity: data.water_clarity || null,
            time_of_day: data.time_of_day || null,
            wind_speed_kmh: data.wind_speed_kmh ? parseInt(data.wind_speed_kmh) : null,
          }]).select().single(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout supabase')), 10000))
        ]) as any

        if (result.error) throw result.error
        const captureData = result.data

        // Salvar setup
        if (data.lure_type && captureData) {
          await supabase.from('setups').insert({
            capture_id: captureData.id,
            user_id: userId,
            lure_type: data.lure_type || null,
            lure_model: data.lure_model || null,
            lure_color: data.lure_color || null,
            hook_size: data.hook_size || null,
            line_lb: data.line_lb ? parseFloat(data.line_lb) : null,
            line_type: data.line_type || null,
          })
        }
      } else {
        // Offline ou Guest
        await savePendingCapture(capturePayload)
      }

      console.log('[NewCaptureForm] Sucesso!')
      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
        window.location.reload()
      }, 1500)

    } catch (err: any) {
      console.error('[NewCaptureForm] Erro crítico no salvamento:', err)
      // Fallback offline total para não perder o dado caso a rede caia no meio
      try {
        await savePendingCapture(capturePayload)
        setSuccess(true) // Mostra sucesso mesmo salvando localmente
        setTimeout(() => { 
          onSuccess?.()
          onClose()
          window.location.reload()
        }, 1500)
      } catch (e2) {
        alert('Erro ao salvar captura. Verifique sua conexão ou espaço no disco.')
        setSaving(false)
      }
    } finally {
      // IMPORTANTE: Garantir que o spinner pare se não tiver tido sucesso imediato
      // mas como o router vai dar refresh, o estado vai resetar de qualquer forma.
      // Se deu erro e não entrou no recover, paramos o load.
      setSaving(false)
    }
  }

  // Tela de sucesso
  if (success) {
    return (
      <div className="fixed inset-0 z-[1600] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-elevated fade-in" style={{ borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎣</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-accent-primary)', marginBottom: 8 }}>
            Captura registrada!
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            {isOnline ? 'Salvo no Supabase.' : 'Salvo offline. Sincronizará quando houver sinal.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center p-2 sm:p-4 bg-black/80"
    >
      <div
        className="glass-elevated fade-in-up"
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 20,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header do Form */}
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>🎣 Novo Log de Captura</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {isOnline
                  ? <><Wifi size={11} color="var(--color-accent-primary)" /><span style={{ fontSize: 11, color: 'var(--color-accent-primary)' }}>Online</span></>
                  : <><WifiOff size={11} color="#ef4444" /><span style={{ fontSize: 11, color: '#ef4444' }}>Será salvo offline</span></>
                }
              </div>
            </div>
            <button onClick={onClose} className="btn-secondary" style={{ width: 36, height: 36, padding: 0, minHeight: 36 }}>
              <X size={16} />
            </button>
          </div>

          {/* Steps indicator */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { n: 1, label: 'Peixe' },
              { n: 2, label: 'Condições' },
              { n: 3, label: 'Setup' },
            ].map(s => (
              <button
                key={s.n}
                onClick={() => setStep(s.n as any)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: 10,
                  border: '2px solid',
                  borderColor: step >= s.n ? 'var(--color-accent-primary)' : 'var(--color-border)',
                  background: step === s.n ? 'var(--color-accent-glow)' : 'transparent',
                  color: step >= s.n ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                }}
              >
                {s.n}. {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body — scrollável */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── STEP 1: Dados do Peixe ──────────────────────── */}
          {step === 1 && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Foto via Celular / Câmera */}
              <div>
                <label className="label"><Camera size={12} /> Foto da Captura</label>
                
                {!photoPreview ? (
                  <div 
                    onClick={() => document.getElementById('photo-upload-input')?.click()}
                    className="btn-secondary" 
                    style={{ width: '100%', padding: '24px', cursor: 'pointer', borderStyle: 'dashed', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
                  >
                    <input 
                      id="photo-upload-input"
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoSelect} 
                      style={{ display: 'none' }}
                    />
                    <div style={{ padding: 16, background: 'var(--color-accent-glow)', borderRadius: '50%', color: 'var(--color-accent-primary)' }}>
                      <Camera size={32} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 14, color: 'white', fontWeight: 800, display: 'block', marginBottom: 4 }}>
                        CLIQUE PARA SELECIONAR FOTO
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                         Galeria ou Câmera
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, background: 'var(--color-bg-elevated)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                    {/* Miniatura Clicável */}
                    <div 
                      onClick={() => setShowFullPhoto(true)}
                      style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden', borderRadius: 8, border: '2px solid var(--color-accent-primary)' }}
                    >
                      <img src={photoPreview || undefined} alt="Preview" style={{ width: 84, height: 84, objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <span style={{ fontSize: 24 }}>🔍</span>
                      </div>
                    </div>
                    {/* Botões de Ação */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                       <label className="btn-secondary" style={{ padding: '10px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: 0, cursor: 'pointer' }}>
                         <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
                         🔄 Trocar Foto
                       </label>
                       <button onClick={() => {setPhotoPreview(null); setPhotoFile(null)}} className="btn-secondary" style={{ padding: '10px', fontSize: 13, borderColor: '#ef444455', color: '#ef4444' }}>
                         🗑️ Remover
                       </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Espécie */}
              <div>
                <label className="label"><Fish size={12} /> Espécie *</label>
                <input
                  id="input-species"
                  className="input"
                  list="species-list"
                  placeholder="Ex: Tucunaré Açu, Dourado, Pirarucu..."
                  value={data.species}
                  onChange={e => set('species', e.target.value)}
                  autoFocus={!photoPreview}
                />
                <datalist id="species-list">
                  {(catalogSpecies.length > 0 
                    ? catalogSpecies.map(s => s.nome_comum) 
                    : ALL_SPECIES.map(s => s.split(' (')[0])
                  ).sort().map(sp => (
                    <option key={sp} value={sp} />
                  ))}
                </datalist>
                
                {/* Alerta de Troféu Automático */}
                {data.is_trophy && data.length_cm && catalogSpecies.find(s => s.nome_comum.toLowerCase() === data.species.toLowerCase()) && (
                  <div className="mt-2 text-xs font-bold text-accent bg-accent/10 p-2 rounded-lg flex items-center gap-2 border border-accent/20 fade-in">
                    🏆 Wow! Esse tamanho é nível Troféu para esta espécie!
                  </div>
                )}
              </div>

              {/* Peso + Comprimento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label"><Scale size={12} /> Peso (kg)</label>
                  <input
                    id="input-weight"
                    className="input"
                    type="number"
                    step="0.1"
                    placeholder="2.5"
                    value={data.weight_kg}
                    onChange={e => set('weight_kg', e.target.value)}
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="label"><Ruler size={12} /> Comp. (cm)</label>
                  <input
                    id="input-length"
                    className="input"
                    type="number"
                    step="0.5"
                    placeholder="45"
                    value={data.length_cm}
                    onChange={e => set('length_cm', e.target.value)}
                    inputMode="decimal"
                  />
                </div>
              </div>

              {/* Checkboxes grandes para mobile */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { key: 'is_trophy', label: '🏆 Troféu', desc: 'Peixe de grande porte' },
                  { key: 'was_released', label: '♻️ Pesca & Solta', desc: 'Devolveu ao rio?' },
                  { key: 'is_public', label: '👁️ Público', desc: 'Visível na comunidade' },
                ].map(opt => (
                  <div
                    key={opt.key}
                    onClick={() => set(opt.key as keyof FormData, !data[opt.key as keyof FormData])}
                    className="chip"
                    style={{
                      minHeight: 72,
                      borderColor: data[opt.key as keyof FormData] ? 'var(--color-accent-primary)' : 'var(--color-border)',
                      background: data[opt.key as keyof FormData] ? 'var(--color-accent-glow)' : 'var(--color-bg-secondary)',
                      color: data[opt.key as keyof FormData] ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{opt.label.split(' ')[0]}</span>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{opt.label.slice(opt.label.indexOf(' ') + 1)}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{opt.desc}</div>
                  </div>
                ))}
              </div>

              {/* Notas */}
              <div>
                <label className="label">📝 Notas</label>
                <textarea
                  id="input-notes"
                  className="input"
                  placeholder="Observações sobre a captura..."
                  value={data.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  style={{ resize: 'none', minHeight: 80 }}
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Condições ───────────────────────────── */}
          {step === 2 && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Hora do Dia */}
              <div>
                <label className="label">⏰ Período do dia</label>
                <div className="chip-grid">
                  {TIME_OF_DAY.map(t => (
                    <div
                      key={t.value}
                      className={`chip ${data.time_of_day === t.value ? 'active' : ''}`}
                      onClick={() => set('time_of_day', t.value)}
                    >
                      <span style={{ fontSize: 20 }}>{t.label.split(' ')[0]}</span>
                      <span>{t.label.slice(t.label.indexOf(' ') + 1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fase da Lua */}
              <div>
                <label className="label"><Moon size={12} /> Fase da Lua</label>
                <select id="select-moon" className="select" value={data.moon_phase} onChange={e => set('moon_phase', e.target.value)}>
                  <option value="">Selecione...</option>
                  {MOON_PHASES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Clima */}
              <div>
                <label className="label"><Cloud size={12} /> Clima</label>
                <div className="chip-grid">
                  {WEATHER_OPTIONS.map(w => (
                    <div
                      key={w.value}
                      className={`chip ${data.weather === w.value ? 'active' : ''}`}
                      onClick={() => set('weather', w.value)}
                    >
                      <span style={{ fontSize: 20 }}>{w.label.split(' ')[0]}</span>
                      <span>{w.label.slice(w.label.indexOf(' ') + 1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Claridade da água */}
              <div>
                <label className="label"><Droplets size={12} /> Claridade da água</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {WATER_CLARITY.map(c => (
                    <div
                      key={c.value}
                      className={`chip ${data.water_clarity === c.value ? 'active' : ''}`}
                      style={{ flex: 1 }}
                      onClick={() => set('water_clarity', c.value)}
                    >
                      <span style={{ fontSize: 18 }}>{c.label.split(' ')[0]}</span>
                      <span>{c.label.slice(c.label.indexOf(' ') + 1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Temperatura */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label"><Thermometer size={12} /> Temp. ar (°C)</label>
                  <input
                    id="input-temp"
                    className="input"
                    type="number"
                    step="0.5"
                    placeholder="28"
                    value={data.temperature_c}
                    onChange={e => set('temperature_c', e.target.value)}
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="label"><Wind size={12} /> Vento (km/h)</label>
                  <input
                    id="input-wind"
                    className="input"
                    type="number"
                    placeholder="15"
                    value={data.wind_speed_kmh}
                    onChange={e => set('wind_speed_kmh', e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Setup (Equipamento) ────────────────── */}
          {step === 3 && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Tipo de Isca */}
              <div>
                <label className="label">Tipo de Isca</label>
                <div className="chip-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
                  {LURE_TYPES.map(lt => (
                    <div
                      key={lt.value}
                      className={`chip ${data.lure_type === lt.value ? 'active' : ''}`}
                      onClick={() => set('lure_type', lt.value)}
                      title={lt.desc}
                    >
                      <span style={{ fontSize: 18 }}>{lt.label.split(' ')[0]}</span>
                      <span style={{ fontSize: 10, textAlign: 'center', lineHeight: 1.2 }}>
                        {lt.label.slice(lt.label.indexOf(' ') + 1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modelo e Cor da isca */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Modelo da Isca</label>
                  <input
                    id="input-lure-model"
                    className="input"
                    placeholder="Ex: Rapala X-Rap"
                    value={data.lure_model}
                    onChange={e => set('lure_model', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Cor da Isca</label>
                  <input
                    id="input-lure-color"
                    className="input"
                    placeholder="Ex: Chartreuse"
                    value={data.lure_color}
                    onChange={e => set('lure_color', e.target.value)}
                  />
                </div>
              </div>

              {/* Anzol */}
              <div>
                <label className="label">Tamanho do Anzol</label>
                <input
                  id="input-hook"
                  className="input"
                  placeholder="Ex: 4/0 ou #8"
                  value={data.hook_size}
                  onChange={e => set('hook_size', e.target.value)}
                />
              </div>

              {/* Linha */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Libragem da Linha</label>
                  <input
                    id="input-line-lb"
                    className="input"
                    type="number"
                    step="0.5"
                    placeholder="20"
                    value={data.line_lb}
                    onChange={e => set('line_lb', e.target.value)}
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="label">Tipo de Linha</label>
                  <select id="select-line-type" className="select" value={data.line_type} onChange={e => set('line_type', e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="mono">Monofilamento</option>
                    <option value="fluorocarbon">Fluorocarbono</option>
                    <option value="braid">Multifilamento</option>
                    <option value="wire">Aço (wire)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer dos botões */}
        <div style={{ padding: '12px 20px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 10 }}>
          {step > 1 && (
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep((step - 1) as any)}>
              ← Voltar
            </button>
          )}
          {step < 3 ? (
            <button
              id="btn-next-step"
              className="btn-primary btn-mobile-lg"
              style={{ flex: 2 }}
              disabled={step === 1 && !data.species}
              onClick={() => setStep((step + 1) as any)}
            >
              Próximo →
            </button>
          ) : (
            <button
              id="btn-save-capture"
              className="btn-primary btn-mobile-lg"
              style={{ flex: 2 }}
              onClick={handleSave}
              disabled={loading || !data.species}
            >
              {loading
                ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Salvando...</>
                : <><Save size={18} /> {isOnline ? 'Salvar Captura' : 'Salvar Offline'}</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Expanded Photo Preview Overlay */}
      {showFullPhoto && photoPreview && (
        <div 
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-md fade-in"
          onClick={() => setShowFullPhoto(false)}
        >
          <button 
            style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={(e) => { e.stopPropagation(); setShowFullPhoto(false); }}
          >
             <X color="#fff" size={24} />
          </button>
          <img 
            src={photoPreview} 
            alt="Foto Ampliada" 
            style={{ maxWidth: '95vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} 
          />
        </div>
      )}
    </div>
  )
}
