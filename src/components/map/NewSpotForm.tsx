'use client'

import { useState } from 'react'
import { X, MapPin, Info, Lock, Globe, Users, Waves, Save, Camera } from 'lucide-react'

interface NewSpotFormProps {
  userId: string
  isOnline: boolean
  onClose: () => void
  onSuccess?: () => void
  initialLat?: number
  initialLng?: number
}

import { getSupabaseClient } from '@/lib/supabase/client'
import { savePendingSpot } from '@/lib/offline/indexeddb'

export default function NewSpotForm({ userId, isOnline, onClose, onSuccess, initialLat, initialLng }: NewSpotFormProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [data, setData] = useState({
    title: '',
    description: '',
    privacy_level: 'public' as 'public' | 'community' | 'private',
    water_type: 'river' as 'river' | 'lake' | 'reservoir' | 'sea' | 'other',
    lat: initialLat || -15.7801,
    lng: initialLng || -47.9292,
  })

  const supabase = getSupabaseClient() as any

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const uploadPhoto = async (spotId: string): Promise<string | null> => {
    if (!photoFile) return null
    try {
      const ext = photoFile.name.split('.').pop()
      const path = `spots/${spotId}/cover.${ext}`
      const { error } = await supabase.storage.from('photos').upload(path, photoFile, { upsert: true })
      if (error) { console.error('Upload foto erro:', error); return null }
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
      return urlData?.publicUrl || null
    } catch (err) {
      console.error('Erro upload foto:', err)
      return null
    }
  }

  const handleSave = async () => {
    if (!data.title) return
    setLoading(true)
    
    // Função auxiliar para garantir UUID v4 válido mesmo sem crypto.randomUUID
    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    }
    
    const secureId = generateUUID()

    const spotPayload = {
      id: secureId,
      user_id: userId,
      title: data.title,
      description: data.description || null,
      lat: data.lat,
      lng: data.lng,
      privacy_level: data.privacy_level,
      water_type: data.water_type,
      photo_url: null,
      fuzz_radius_m: 0,
      created_locally_at: new Date().toISOString(),
    }

    // Função de auxilio para evitar deadlock no indexedDB
    const safeSaveOffline = async (payload: any) => {
      console.log('[NewSpotForm] Iniciando salvamento offline de segurança...')
      try {
        await Promise.race([
          savePendingSpot(payload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout idb')), 5000))
        ])
        console.log('[NewSpotForm] Sucesso no salvamento offline.')
      } catch (e) {
        console.error('[NewSpotForm] Falha ou timeout no salvamento offline cache:', e)
      }
    }

    try {
      // Se for guest, salvamos offline independente da conexão para evitar erro de UUID
      const isGuest = userId === 'guest-user'
      
      if (isOnline && !isGuest) {
        console.log('[NewSpotForm] Tentando salvar no Supabase...', { userId, isGuest })
        
        // Timeout para a chamada do Supabase para evitar hang eterno
        const result = await Promise.race([
          supabase.from('spots').insert([{
            id: secureId, // Passamos o ID gerado localmente para garantir idempotência
            user_id: userId,
            title: data.title,
            description: data.description || null,
            privacy_level: data.privacy_level,
            water_type: data.water_type,
            location: `SRID=4326;POINT(${data.lng} ${data.lat})`,
            is_active: true
          }]).select('id').single(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout supabase')), 10000))
        ]) as any

        if (result.error) {
          console.error('[NewSpotForm] Erro retornado pelo Supabase:', result.error)
          throw result.error
        }

        // Upload da foto se escolhida
        if (result.data?.id && photoFile) {
          const photoUrl = await uploadPhoto(result.data.id)
          if (photoUrl) {
            await supabase.from('spots').update({ photo_url: photoUrl }).eq('id', result.data.id)
          }
        }

        console.log('[NewSpotForm] Sucesso no Supabase.')
      } else {
        console.log('[NewSpotForm] Modo offline ou Guest Detectado. Salvando via IDB.')
        // Salvar offline (IndexedDB)
        await safeSaveOffline(spotPayload)
      }

      console.log('[NewSpotForm] Fluxo concluído com sucesso. Exibindo tela de confirmação.')
      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      console.error('[NewSpotForm] Catch disparado. Fallback para offline:', error)
      // Fallback offline em caso de erro
      await safeSaveOffline(spotPayload)
      console.log('[NewSpotForm] Fallback offline concluído. Exibindo sucesso (local).')
      setSuccess(true)
      setTimeout(() => { 
        onSuccess?.(); 
        onClose(); 
        window.location.reload(); 
      }, 1500)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-black/90">
        <div className="glass-elevated fade-in" style={{ borderRadius: 24, padding: 48, textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📍</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-accent-primary)', marginBottom: 8 }}>
            Ponto Adicionado!
          </h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
            Seu novo ponto de pesca foi registrado com sucesso.
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
          maxWidth: 500,
          borderRadius: 24,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin className="text-accent" /> Adicionar Ponto de Pesca
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Compartilhe um novo local com a comunidade
              </p>
            </div>
            <button onClick={onClose} className="btn-secondary" style={{ width: 40, height: 40, padding: 0 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Título */}
          <div>
            <label className="label">Nome do Ponto *</label>
            <input
              className="input"
              placeholder="Ex: Curva do Rio Araguaia"
              value={data.title}
              onChange={e => setData(d => ({ ...d, title: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="label">Descrição / Dicas</label>
            <textarea
              className="input"
              placeholder="Fale sobre o local, estruturas, etc..."
              value={data.description}
              onChange={e => setData(d => ({ ...d, description: e.target.value }))}
              rows={3}
              style={{ resize: 'none' }}
            />
          </div>

          {/* Nível de Privacidade */}
          <div>
            <label className="label">Privacidade do Local</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { id: 'public', icon: <Globe size={18} />, label: 'Público', desc: 'Para todos' },
                { id: 'community', icon: <Users size={18} />, label: 'Comunitário', desc: 'Desbloqueável' },
                { id: 'private', icon: <Lock size={18} />, label: 'Privado', desc: 'Só para você' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setData(d => ({ ...d, privacy_level: opt.id as any }))}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 8px',
                    borderRadius: 16,
                    border: '2px solid',
                    borderColor: data.privacy_level === opt.id ? 'var(--color-accent-primary)' : 'var(--color-border)',
                    background: data.privacy_level === opt.id ? 'var(--color-accent-glow)' : 'transparent',
                    color: data.privacy_level === opt.id ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {opt.icon}
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{opt.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Água */}
          <div>
            <label className="label"><Waves size={14} /> Ambiente Aquático</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { id: 'river', label: 'Rio' },
                { id: 'lake', label: 'Lago' },
                { id: 'reservoir', label: 'Represa' },
                { id: 'sea', label: 'Mar' },
                { id: 'other', label: 'Outro' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setData(d => ({ ...d, water_type: opt.id as any }))}
                  className={`chip ${data.water_type === opt.id ? 'active' : ''}`}
                  style={{ flex: '1 0 30%' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Localização (Simulada) */}
          <div className="glass" style={{ padding: 16, borderRadius: 16, border: '1px dashed var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin className="text-accent" size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Localização Selecionada</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Lat: {data.lat.toFixed(4)}, Lng: {data.lng.toFixed(4)}
                </div>
              </div>
            </div>
          </div>

          {/* Upload de Foto */}
          <div>
            <label className="label"><Camera size={14} /> Foto do Local</label>
            {photoPreview ? (
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 160 }}>
                <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button 
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                  className="btn-secondary"
                  style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, padding: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.6)' }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label 
                htmlFor="spot-photo-input"
                className="btn-secondary" 
                style={{ 
                  width: '100%', height: 80, borderStyle: 'dashed', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                <Camera size={20} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Tirar Foto ou Escolher do Dispositivo</span>
              </label>
            )}
            <input 
              id="spot-photo-input"
              type="file" 
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px 32px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 12 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            style={{ flex: 2 }}
            disabled={loading || !data.title}
            onClick={handleSave}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 18, height: 18 }} /> Registrando...</>
            ) : (
              <><Save size={18} /> Salvar Ponto</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
