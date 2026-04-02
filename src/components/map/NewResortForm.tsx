'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Save, Utensils, Wifi, Warehouse, Anchor, Car, Clock, Instagram, Phone, Globe, Star, Fish, Camera, Plus, Minus, MessageSquare, Navigation, Baby, UtensilsCrossed, Dumbbell, Heart } from 'lucide-react'
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
  const [pinPickerOpen, setPinPickerOpen] = useState(false)
  const miniMapRef = useRef<HTMLDivElement>(null)
  const miniMapInstanceRef = useRef<any>(null)
  const miniMarkerRef = useRef<any>(null)
  const [data, setData] = useState({
    title: '',
    description: '',
    opening_hours: '',
    phone: '',
    whatsapp: '',
    email: '',
    instagram: '',
    website: '',
    team_message: '',
    infra: {
      restaurante: false,
      banheiros: false,
      wi_fi: false,
      pousada: false,
      aluguel_equipamento: false,
      estacionamento: false,
      area_kids: false,
      pesca_esportiva: false,
      pesca_familia: false,
      whatsapp_link: false,
      email: ''
    },
    opening_hours_structured: {
      seg_sex: '07:00 às 18:00',
      sab_dom: '06:00 às 19:00',
      feriados: '06:00 às 19:00'
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

  // Inicializar mini-mapa quando o pinPicker abre
  useEffect(() => {
    if (!pinPickerOpen || !miniMapRef.current) return

    let mounted = true
    let mapInst: any = null

    const initMini = async () => {
      const L = (await import('leaflet')).default
      if (!mounted || !miniMapRef.current) return

      // @ts-expect-error leaflet css
      await import('leaflet/dist/leaflet.css')

      // Limpeza residual
      const el = miniMapRef.current
      if ((el as any)._leaflet_id) {
        el.classList.remove('leaflet-container','leaflet-touch','leaflet-retina','leaflet-fade-anim','leaflet-grab','leaflet-touch-drag','leaflet-touch-zoom')
        ;(el as any)._leaflet_id = null
      }

      mapInst = L.map(el, { center: [data.lat, data.lng], zoom: 13, zoomControl: false, attributionControl: false })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(mapInst)

      const pinIcon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;background:#a855f7;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(168,85,247,0.6);"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      })

      const marker = L.marker([data.lat, data.lng], { icon: pinIcon, draggable: true }).addTo(mapInst)
      miniMarkerRef.current = marker

      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        setData(d => ({ ...d, lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) }))
      })

      mapInst.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        marker.setLatLng([lat, lng])
        setData(d => ({ ...d, lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) }))
      })

      miniMapInstanceRef.current = mapInst
    }

    initMini()

    return () => {
      mounted = false
      if (miniMapInstanceRef.current) {
        try { miniMapInstanceRef.current.remove() } catch {}
        miniMapInstanceRef.current = null
        miniMarkerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinPickerOpen])

  // Sincronizar marker quando lat/lng mudam via inputs enquanto o mapa está aberto
  useEffect(() => {
    if (!miniMarkerRef.current || !miniMapInstanceRef.current) return
    try {
      miniMarkerRef.current.setLatLng([data.lat, data.lng])
      miniMapInstanceRef.current.panTo([data.lat, data.lng])
    } catch {}
  }, [data.lat, data.lng])

  const handleUseMyLocation = () => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setData(d => ({ ...d, lat: parseFloat(pos.coords.latitude.toFixed(6)), lng: parseFloat(pos.coords.longitude.toFixed(6)) }))
      },
      () => alert('Não foi possível obter sua localização. Verifique as permissões de GPS.'),
      { enableHighAccuracy: true, timeout: 6000 }
    )
  }

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

  useEffect(() => {
    if (initialLat && initialLng) {
      setData(d => ({ ...d, lat: initialLat, lng: initialLng }))
    } else {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setData(d => ({ ...d, lat: parseFloat(pos.coords.latitude.toFixed(6)), lng: parseFloat(pos.coords.longitude.toFixed(6)) }))
          },
          () => console.log('Não foi possível auto-geolocalizar (permissão negada/timeout).'),
          { enableHighAccuracy: true, timeout: 5000 }
        )
      }
    }
  }, [initialLat, initialLng])

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

    // Padronizar hours string
    const hoursStr = `Seg-Sex: ${data.opening_hours_structured.seg_sex} | Sab-Dom: ${data.opening_hours_structured.sab_dom} | Fer: ${data.opening_hours_structured.feriados}`

    setLoading(true)
    try {
      // 1. Criar o Spot primeiro (obrigatório para ter um Resort)
      const { data: spotData, error: spotError } = await supabase
        .from('spots')
        .insert([{
          user_id: userId,
          title: data.title,
          description: data.description || null,
          location: `POINT(${data.lng} ${data.lat})`, // PostGIS
          privacy_level: 'public',
          water_type: 'lake',
          is_active: true, // O ponto no mapa
          fuzz_radius_m: 0
        }])
        .select()
        .single()

      if (spotError) throw spotError

      // 2. Criar o Resort vinculado ao Spot
      // is_active: true para que o spot apareça imediatamente no mapa como ponto público.
      // O fluxo de publicação no painel admin é para virar Parceiro Oficial (com badge).
      const { error: resortError } = await supabase
        .from('fishing_resorts')
        .insert([{
          spot_id: spotData.id,
          owner_id: userId,
          opening_hours: hoursStr,
          prices: data.prices as any,
          phone: data.phone || null,
          instagram: data.instagram || null,
          website: data.website || null,
          is_partner: false, 
          is_active: true, // Spot visível no mapa imediatamente
          main_species: data.main_species,
          infrastructure: {
            ...data.infra,
            whatsapp: data.whatsapp,
            email: data.email
          } as any
        }])

      if (resortError) throw resortError

      setSuccess(true)
      setTimeout(() => {
        window.location.href = '/resort-admin' // Redireciona para o fluxo de revisão
      }, 3000)
    } catch (err: any) {
      console.error('Erro ao salvar pesqueiro:', err)
      alert('Erro ao salvar: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  // Tela de sucesso com a mensagem correta
  if (success) {
    return (
      <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-black/95">
        <div className="glass-elevated fade-in text-center p-12 max-w-md rounded-[40px] border border-accent/20 space-y-6">
          <div className="text-7xl animate-bounce">📋</div>
          <div>
            <h2 className="text-3xl font-black text-accent uppercase italic tracking-tighter mb-3">
              Quase lá!
            </h2>
            <p className="text-gray-300 text-base leading-relaxed">
              O rascunho do seu pesqueiro foi salvo com sucesso.
            </p>
          </div>
          <div className="flex items-center gap-3 px-6 py-4 bg-accent/10 rounded-2xl border border-accent/20 text-left">
            <Plus size={20} className="text-accent shrink-0" />
            <p className="text-sm text-gray-400">
              Estamos te enviando para o seu <strong className="text-white">Painel de Administração</strong> para publicar no mapa.
            </p>
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
             width: '100%', maxWidth: 715, borderRadius: 28, maxHeight: '95vh', 
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
                { id: 'restaurante', icon: <UtensilsCrossed size={18} />, label: 'Restaurante' },
                { id: 'area_kids', icon: <Baby size={18} />, label: 'Área Kids' },
                { id: 'pesca_esportiva', icon: <Dumbbell size={18} />, label: 'Esportiva' },
                { id: 'pesca_familia', icon: <Heart size={18} />, label: 'Família' },
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
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
            <h3 className="text-xs font-black text-accent uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} /> Padronização de Funcionamento
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label className="label" style={{ fontSize: 10 }}>Seg a Sex</label>
                <input 
                  className="input" 
                  style={{ padding: '10px' }}
                  placeholder="07h às 18h" 
                  value={data.opening_hours_structured.seg_sex}
                  onChange={e => setData(d => ({ 
                    ...d, 
                    opening_hours_structured: { ...d.opening_hours_structured, seg_sex: e.target.value } 
                  }))}
                />
              </div>
              <div>
                <label className="label" style={{ fontSize: 10 }}>Sáb e Dom</label>
                <input 
                  className="input" 
                  style={{ padding: '10px' }}
                  placeholder="06h às 19h" 
                  value={data.opening_hours_structured.sab_dom}
                  onChange={e => setData(d => ({ 
                    ...d, 
                    opening_hours_structured: { ...d.opening_hours_structured, sab_dom: e.target.value } 
                  }))}
                />
              </div>
              <div>
                <label className="label" style={{ fontSize: 10 }}>Feriados</label>
                <input 
                  className="input" 
                  style={{ padding: '10px' }}
                  placeholder="Mesmo horário" 
                  value={data.opening_hours_structured.feriados}
                  onChange={e => setData(d => ({ 
                    ...d, 
                    opening_hours_structured: { ...d.opening_hours_structured, feriados: e.target.value } 
                  }))}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label"><Phone size={14} /> Telefone Fixo</label>
              <input 
                className="input" 
                placeholder="(00) 0000-0000" 
                value={data.phone}
                onChange={e => {
                  let val = e.target.value.replace(/\D/g, '')
                  if (val.length > 11) val = val.substring(0, 11) // Allow up to 11 for mobile-like numbers
                  
                  if (val.length === 11) {
                    val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`
                  } else if (val.length === 10) {
                    val = `(${val.slice(0, 2)}) ${val.slice(2, 6)}-${val.slice(6)}`
                  } else if (val.length > 2) {
                    val = `(${val.slice(0, 2)}) ${val.slice(2)}`
                  }
                  setData(d => ({ ...d, phone: val }))
                }}
              />
            </div>
            <div>
              <label className="label" style={{ color: 'var(--color-accent-primary)' }}><MessageSquare size={14} /> WhatsApp Reserva</label>
              <input 
                className="input" 
                placeholder="(00) 00000-0000" 
                value={data.whatsapp}
                onChange={e => {
                  let val = e.target.value.replace(/\D/g, '')
                  if (val.length > 11) val = val.substring(0, 11)
                  
                  if (val.length === 11) {
                    val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`
                  } else if (val.length === 10) {
                    val = `(${val.slice(0, 2)}) ${val.slice(2, 6)}-${val.slice(6)}`
                  } else if (val.length > 2) {
                    val = `(${val.slice(0, 2)}) ${val.slice(2)}`
                  }
                  setData(d => ({ ...d, whatsapp: val }))
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label"><Globe size={14} /> Email de Contato</label>
              <input 
                className="input" 
                type="email"
                placeholder="contato@pesqueiro.com" 
                value={data.email}
                onChange={e => setData(d => ({ ...d, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="label"><Instagram size={14} /> Link Instagram</label>
              <input 
                className="input" 
                placeholder="@perfil_pesqueiro" 
                value={data.instagram}
                onChange={e => setData(d => ({ ...d, instagram: e.target.value }))}
              />
            </div>
          </div>

          <div>
             <label className="label"><Globe size={14} /> Website oficial</label>
             <input 
               className="input" 
               placeholder="www.seusite.com.br" 
               value={data.website}
               onChange={e => setData(d => ({ ...d, website: e.target.value }))}
             />
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
          <div className="glass" style={{ padding: 16, borderRadius: 16, border: '1px dashed var(--color-accent-glow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin className="text-secondary" size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Localização do Pesqueiro</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Lat: {data.lat.toFixed(5)}, Lng: {data.lng.toFixed(5)}
                </div>
              </div>
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="btn-secondary"
                style={{ height: 36, padding: '0 12px', borderRadius: 12, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                title="Usar minha localização atual"
              >
                <Navigation size={14} />
                GPS
              </button>
            </div>

            {/* Botão para abrir o Mini-Mapa */}
            <button
              type="button"
              onClick={() => setPinPickerOpen(v => !v)}
              style={{
                width: '100%', padding: '12px', borderRadius: 14,
                border: '2px solid',
                borderColor: pinPickerOpen ? 'var(--color-accent-primary)' : 'var(--color-border)',
                background: pinPickerOpen ? 'var(--color-accent-glow)' : 'rgba(168,85,247,0.05)',
                color: pinPickerOpen ? 'var(--color-accent-primary)' : '#a855f7',
                fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s ease', cursor: 'pointer', marginBottom: pinPickerOpen ? 12 : 0
              }}
            >
              <MapPin size={16} />
              {pinPickerOpen ? 'Fechar Mapa' : '📍 Clique aqui para definir a posição no mapa'}
            </button>

            {/* Mini-mapa embutido */}
            {pinPickerOpen && (
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid rgba(168,85,247,0.4)', position: 'relative' }}>
                <div
                  ref={miniMapRef}
                  style={{ width: '100%', height: 240, cursor: 'crosshair', zIndex: 1 }}
                />
                
                {/* Botões de Zoom */}
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1000 }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    title="Mais Zoom"
                    style={{ width: 34, height: 34, padding: 0, borderRadius: 10, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(168,85,247,0.4)' }} 
                    onClick={() => miniMapInstanceRef.current?.zoomIn()}
                  >
                    <Plus size={18} color="white" />
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    title="Menos Zoom"
                    style={{ width: 34, height: 34, padding: 0, borderRadius: 10, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(168,85,247,0.4)' }} 
                    onClick={() => miniMapInstanceRef.current?.zoomOut()}
                  >
                    <Minus size={18} color="white" />
                  </button>
                </div>

                <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', fontSize: 11, color: '#a855f7', fontWeight: 700, textAlign: 'center', position: 'relative', zIndex: 10 }}>
                  🖱️ Clique no mapa ou arraste o marcador para definir a posição
                </div>
              </div>
            )}

            {/* Inputs manuais de lat/lng */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
               <div>
                 <label style={{ fontSize: 10, fontWeight: 800, color: 'gray', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Latitude</label>
                 <input 
                   type="number" step="0.000001"
                   className="input" style={{ fontSize: 12, padding: '8px 12px' }}
                   value={data.lat}
                   onChange={e => setData(d => ({ ...d, lat: parseFloat(e.target.value) }))}
                 />
               </div>
               <div>
                 <label style={{ fontSize: 10, fontWeight: 800, color: 'gray', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Longitude</label>
                 <input 
                   type="number" step="0.000001"
                   className="input" style={{ fontSize: 12, padding: '8px 12px' }}
                   value={data.lng}
                   onChange={e => setData(d => ({ ...d, lng: parseFloat(e.target.value) }))}
                 />
               </div>
            </div>
          </div>

          {/* Mensagem para a equipe Fishgada */}
          <div>
            <label className="label"><MessageSquare size={14} /> Mensagem para a Equipe Fishgada</label>
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
