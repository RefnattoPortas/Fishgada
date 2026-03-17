'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Save, Utensils, Wifi, Warehouse, Anchor, Car, Clock, Instagram, Phone, Globe, Star, Fish, Camera, Plus, MessageSquare } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface NewResortFormProps {
  userId: string
  isOnline: boolean
  initialLat?: number
  initialLng?: number
  onClose: () => void
  onSuccess?: () => void
}

const FISH_SPECIES = [
  'Tambacu', 'Tambaqui', 'Pirarara', 'Pincachola', 'Pintado', 'Tilápia', 'Carpa', 'Pacu', 'Matrinxã', 'Dourado'
]

export default function NewResortForm({ userId, isOnline, initialLat, initialLng, onClose, onSuccess }: NewResortFormProps) {
  const [loading, setLoading] = useState(false)
  const [checkingTier, setCheckingTier] = useState(true)
  const [userTier, setUserTier] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [data, setData] = useState({
    title: '',
    description: '',
    opening_hours: '',
    phone: '',
    instagram: '',
    website: '',
    team_message: '',
    infra: {
      restaurante: false,
      banheiros: false,
      wi_fi: false,
      pousada: false,
      aluguel_equipamento: false,
      estacionamento: false
    },
    main_species: [] as string[],
    prices: {
      entry: '',
      fishing: '',
      kg: ''
    },
    is_partner: false,
    lat: initialLat || -15.7801,
    lng: initialLng || -47.9292
  })

  const supabase = getSupabaseClient() as any

  useEffect(() => {
    const fetchTier = async () => {
      if (!userId || userId === 'guest-user') {
        setCheckingTier(false)
        return
      }
      const { data } = await supabase.from('profiles').select('subscription_tier').eq('id', userId).single()
      setUserTier(data?.subscription_tier || 'free')
      setCheckingTier(false)
    }
    fetchTier()
  }, [userId])

  const toggleInfra = (key: keyof typeof data.infra) => {
    setData(d => ({
      ...d,
      infra: { ...d.infra, [key]: !d.infra[key] }
    }))
  }

  const toggleSpecies = (sp: string) => {
    setData(d => ({
      ...d,
      main_species: d.main_species.includes(sp) 
        ? d.main_species.filter(s => s !== sp)
        : [...d.main_species, sp]
    }))
  }

  const handleSave = async () => {
    if (!data.title) return
    
    if (userId === 'guest-user') {
      alert('Cadastro de pesqueiros oficiais requer uma conta de parceiro. Por favor, faça login.')
      return
    }

    if (!isOnline) {
      alert('Sem conexão. O cadastro de pesqueiros requer internet para registro oficial das coordenadas.')
      return
    }

    setLoading(true)

    try {
      // Criar o Resort diretamente (estrutura real do banco: owner_id + name + location)
      const { error: resortError } = await supabase
        .from('fishing_resorts')
        .insert([{
          owner_id: userId,
          name: data.title,
          description: data.description || null,
          location: `SRID=4326;POINT(${data.lng} ${data.lat})`,
          infrastructure: data.infra as any,
          opening_hours: { text: data.opening_hours } as any,
          prices: data.prices as any,
          phone: data.phone || null,
          instagram: data.instagram || null,
          website: data.website || null,
          is_partner: false, // Sempre começa como false, aguarda aprovação
          main_species: data.main_species
        }])

      if (resortError) throw resortError

      // Se há mensagem para a equipe, registra como notificação interna (opcional)
      if (data.team_message) {
        console.log('[WikiFish] Mensagem recebida do proprietário:', data.team_message)
        // Futuramente: enviar email para equipe WikiFish
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 4000)
    } catch (err: any) {
      console.error('Erro ao salvar pesqueiro:', err)
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Tela de sucesso com a mensagem correta
  if (success) {
    return (
      <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-black/95">
        <div className="glass-elevated fade-in text-center p-12 max-w-md rounded-[40px] border border-accent/20 space-y-6">
          <div className="text-7xl animate-bounce">🏡</div>
          <div>
            <h2 className="text-3xl font-black text-accent uppercase italic tracking-tighter mb-3">
              Pesqueiro no Mapa!
            </h2>
            <p className="text-gray-300 text-base leading-relaxed">
              Seu pesqueiro já está no mapa! Em breve entraremos em contato para{' '}
              <span className="text-accent font-bold">ativar as funções premium</span>.
            </p>
          </div>
          <div className="flex items-center gap-3 px-6 py-4 bg-accent/10 rounded-2xl border border-accent/20 text-left">
            <Star size={20} className="text-amber-400 fill-amber-400 shrink-0" />
            <p className="text-sm text-gray-400">
              Após a análise da nossa equipe, seu perfil será elevado para <strong className="text-amber-400">Parceiro Elite</strong>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Security Filter View — bloqueia usuários free e guests
  if (!checkingTier && (userId === 'guest-user' || userTier === 'free')) {
    return (
      <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-black/90">
        <div className="glass-elevated fade-in text-center p-12 max-w-sm rounded-[32px] border border-white/5">
           <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500 mx-auto mb-6">
              <Star size={40} className="fill-current" />
           </div>
           <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Acesso Restrito</h2>
           <p className="text-gray-400 text-sm mb-8">
             Apenas usuários com assinatura <span className="text-amber-500 font-bold italic underline">Elite ou Parceiro</span> podem registrar estabelecimentos oficiais no mapa.
           </p>
           <div className="space-y-3">
              <button 
                onClick={onClose} 
                className="btn-secondary w-full py-3 rounded-2xl font-bold"
              >
                Voltar
              </button>
           </div>
        </div>
      </div>
    )
  }

  if (checkingTier) return null

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-2 sm:p-4 bg-black/80">
      <div className="glass-elevated fade-in-up" 
           style={{ 
             width: '100%', maxWidth: 550, borderRadius: 28, maxHeight: '95vh', 
             display: 'flex', flexDirection: 'column', overflow: 'hidden' 
           }}>
        
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Warehouse className="text-accent" /> Cadastrar Pesqueiro
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Adicione detalhes comerciais e infraestrutura
              </p>
            </div>
            <button onClick={onClose} className="btn-secondary" style={{ width: 44, height: 44, padding: 0, borderRadius: 16 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }} className="custom-scrollbar">
          
          {/* Nome */}
          <div>
            <label className="label">Nome do Estabelecimento *</label>
            <input 
              className="input" 
              placeholder="Ex: Pesqueiro do Japa" 
              value={data.title}
              onChange={e => setData(d => ({ ...d, title: e.target.value }))}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="label">Descrição do Pesqueiro</label>
            <textarea 
              className="input" 
              placeholder="Fale sobre o local, estrutura, diferenciais..." 
              value={data.description}
              onChange={e => setData(d => ({ ...d, description: e.target.value }))}
              rows={3}
              style={{ resize: 'none' }}
            />
          </div>

          {/* Infraestrutura */}
          <div>
            <label className="label">Infraestrutura Disponível</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { id: 'restaurante', icon: <Utensils size={18} />, label: 'Restaurante' },
                { id: 'banheiros', icon: <Warehouse size={18} />, label: 'Banheiros' },
                { id: 'wi_fi', icon: <Wifi size={18} />, label: 'Wi-Fi' },
                { id: 'pousada', icon: <Warehouse size={18} />, label: 'Pousada' },
                { id: 'aluguel_equipamento', icon: <Anchor size={18} />, label: 'Aluguel' },
                { id: 'estacionamento', icon: <Car size={18} />, label: 'Estacionamento' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => toggleInfra(opt.id as any)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px',
                    borderRadius: 18, border: '2px solid',
                    borderColor: data.infra[opt.id as keyof typeof data.infra] ? 'var(--color-accent-primary)' : 'var(--color-border)',
                    background: data.infra[opt.id as keyof typeof data.infra] ? 'var(--color-accent-glow)' : 'rgba(255,255,255,0.02)',
                    color: data.infra[opt.id as keyof typeof data.infra] ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {opt.icon}
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Espécies do Tanque */}
          <div>
            <label className="label"><Fish size={14} /> Espécies nos Tanques</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {FISH_SPECIES.map(sp => (
                <button
                  key={sp}
                  onClick={() => toggleSpecies(sp)}
                  className={`chip ${data.main_species.includes(sp) ? 'active' : ''}`}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>

          {/* Horários e Contato */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label"><Clock size={14} /> Funcionamento</label>
              <input 
                className="input" 
                placeholder="Ex: Ter a Dom, 07h às 18h" 
                value={data.opening_hours}
                onChange={e => setData(d => ({ ...d, opening_hours: e.target.value }))}
              />
            </div>
            <div>
              <label className="label"><Phone size={14} /> Telefone</label>
              <input 
                className="input" 
                placeholder="(11) 99999-9999" 
                value={data.phone}
                onChange={e => setData(d => ({ ...d, phone: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label"><Instagram size={14} /> Instagram</label>
              <input 
                className="input" 
                placeholder="@pesqueiro" 
                value={data.instagram}
                onChange={e => setData(d => ({ ...d, instagram: e.target.value }))}
              />
            </div>
            <div>
              <label className="label"><Globe size={14} /> Website</label>
              <input 
                className="input" 
                placeholder="www.pesqueiro.com" 
                value={data.website}
                onChange={e => setData(d => ({ ...d, website: e.target.value }))}
              />
            </div>
          </div>

          {/* Taxa de Entrada */}
          <div>
            <label className="label">Taxa de Entrada</label>
            <input 
              className="input" 
              placeholder="Ex: R$ 50,00"
              value={data.prices.entry}
              onChange={e => setData(d => ({ ...d, prices: { ...d.prices, entry: e.target.value } }))}
            />
          </div>

          {/* Localização */}
          <div className="glass" style={{ padding: 16, borderRadius: 16, border: '1px dashed var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin className="text-accent" size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Localização do Pesqueiro</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Lat: {data.lat.toFixed(4)}, Lng: {data.lng.toFixed(4)}
                </div>
              </div>
            </div>
          </div>

          {/* Mensagem para a equipe WikiFish */}
          <div>
            <label className="label"><MessageSquare size={14} /> Mensagem para a Equipe WikiFish</label>
            <textarea 
              className="input" 
              placeholder="Dúvidas, expectativas ou informações adicionais sobre seu pesqueiro..." 
              value={data.team_message}
              onChange={e => setData(d => ({ ...d, team_message: e.target.value }))}
              rows={3}
              style={{ resize: 'none' }}
            />
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Nossa equipe entrará em contato para ativar as funções premium do seu perfil.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '20px 28px 32px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 12 }}>
          <button className="btn-secondary" style={{ flex: 1, borderRadius: 16 }} onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            style={{ flex: 2, borderRadius: 16 }}
            disabled={loading || !data.title}
            onClick={handleSave}
          >
            {loading ? <span className="spinner" /> : <Save size={18} />} Salvar Pesqueiro
          </button>
        </div>
      </div>
    </div>
  )
}
