'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { SpeciesAlbum } from '@/types/database'
import { Fish, MapPin, Scale, ChevronLeft, Info, Trophy, Link as LinkIcon, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import Sidebar from '@/components/layout/Sidebar'

export default function SpeciesCatalogPage() {
  const [species, setSpecies] = useState<SpeciesAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesAlbum | null>(null)
  
  // Como as imagens serão estáticas/placeholders, podemos até definir uma padrão
  const DEFAULT_FISH_IMG = 'https://cdn-icons-png.flaticon.com/512/2970/2970068.png' // Ícone estilizado temporário

  useEffect(() => {
    fetchSpecies()
  }, [])

  const fetchSpecies = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient() as any
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return

      // 1. Buscar TODAS as espécies ativas do catálogo
      const { data: speciesData, error: speciesError } = await supabase
        .from('species')
        .select('*')
        .eq('is_active', true)
        
      if (speciesError) {
        if (speciesError.code !== '42P01') console.error('Erro ao buscar species:', speciesError)
        return
      }

      // 2. Buscar as capturas do usuário logado
      const { data: capturesData, error: capturesError } = await supabase
        .from('captures')
        .select('id, species, length_cm, weight_kg, captured_at, photo_url')
        .eq('user_id', session.user.id)

      if (capturesError) {
        console.error('Erro ao buscar capturas:', capturesError)
      }

      const userCaptures = capturesData || []

      // 3. Mesclar (Join) no frontend
      const mergedAlbum: SpeciesAlbum[] = (speciesData || []).map((s: any) => {
        // Encontrar todas as capturas desta espécie pelo nome
        const myCatches = userCaptures.filter((c: any) => {
          const captName = c.species?.split(' (')[0].trim().toLowerCase();
          const specName = s.nome_comum?.split(' (')[0].trim().toLowerCase();
          return captName === specName;
        })

        // Tentar encontrar uma foto das capturas do usuário (se houver preferência no localStorage)
        const highlightId = typeof window !== 'undefined' ? localStorage.getItem(`album_highlight_${s.nome_comum}`) : null
        const highlightCatch = highlightId ? myCatches.find((c: any) => c.id === highlightId) : null
        const userPhoto = highlightCatch?.photo_url || myCatches.find((c: any) => c.photo_url)?.photo_url

        return {
          species_id: s.id,
          nome_comum: s.nome_comum,
          nome_cientifico: s.nome_cientifico,
          habitat: s.habitat,
          tamanho_recorde_cm: s.tamanho_recorde_cm,
          peso_recorde_kg: s.peso_recorde_kg,
          isca_favorita: s.isca_favorita,
          dica_pro: s.dica_pro,
          tamanho_minimo_cm: s.tamanho_minimo_cm,
          imagem_url: userPhoto || s.imagem_url, // PRIORIDADE PARA A FOTO DO USUÁRIO
          user_id: session.user.id,
          total_capturas: myCatches.length,
          maior_tamanho_capturado_cm: myCatches.length > 0 ? Math.max(...myCatches.map((c: any) => c.length_cm || 0)) : null,
          maior_peso_capturado_kg: myCatches.length > 0 ? Math.max(...myCatches.map((c: any) => c.weight_kg || 0)) : null,
          ultima_captura: myCatches.length > 0 ? myCatches.reduce((latest: string, c: any) => c.captured_at > latest ? c.captured_at : latest, myCatches[0].captured_at) : null
        }
      })

      // Ordenar: Primeiro os capturados, depois os não capturados (em ordem alfabética)
      const sortedAlbum = mergedAlbum.sort((a, b) => {
        if (a.total_capturas > 0 && b.total_capturas === 0) return -1;
        if (a.total_capturas === 0 && b.total_capturas > 0) return 1;
        return a.nome_comum.localeCompare(b.nome_comum);
      });

      setSpecies(sortedAlbum)

    } catch (e) {
      console.error('Erro no catálogo:', e)
    } finally {
      setLoading(false)
    }
  }

  const displaySpecies = species.length > 0 ? species : []

  return (
    <div 
      id="app-shell"
      style={{
        display: 'flex',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--color-bg-primary)',
      }}
    >
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-y-auto app-bg text-white pb-32">
        {/* HEADER */}
        <div className="sticky top-0 z-40 bg-[#060a12]/90 backdrop-blur-xl mobile-header-padding pr-4 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Fish size={22} className="text-accent" />
              Catálogo de Espécies
            </h1>
            <span className="text-xs text-brand font-medium tracking-wide opacity-80">
              {species.filter(s => s.total_capturas > 0).length} / {species.length || 20} descobertas
            </span>
          </div>
        </div>
      </div>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex flex-col gap-6 fade-in">
        {/* Banner Motivacional */}
        <div className="bg-gradient-to-r from-accent/20 to-brand/10 p-6 rounded-3xl border border-accent/20 relative overflow-hidden">
          <div className="absolute right-[-10%] top-[-10%] opacity-10">
            <Fish size={140} />
          </div>
          <div className="relative z-10 flex flex-col gap-2 max-w-[80%]">
            <h2 className="text-lg font-black text-white">Colecione Troféus 🏆</h2>
            <p className="text-sm text-gray-400 font-medium leading-relaxed">
              Descubra os gigantes das bacias sul-americanas. Preencha seu álbum capturando cada uma destas espécies e construa seu legado.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner w-8 h-8 border-2 border-accent border-t-transparent" />
          </div>
        ) : species.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <AlertCircle size={48} className="text-gray-500 opacity-50" />
            <p className="text-gray-400 text-sm font-medium">Catálogo ainda não foi ativado (Migration Pendente).</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displaySpecies.map(s => {
              const isCaught = s.total_capturas > 0

              return (
                <div 
                  key={s.species_id}
                  onClick={() => setSelectedSpecies(s)}
                  className={`relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-[1.02] border-2 ${
                    isCaught 
                      ? 'border-accent/40 bg-accent/5' 
                      : 'border-white/5 bg-gray-900/50 grayscale hover:grayscale-0'
                  }`}
                >
                  {/* Etiqueta de quantidade */}
                  {isCaught && (
                    <div className="absolute top-3 right-3 bg-accent text-brand px-2 py-0.5 rounded-full text-[10px] font-black z-20">
                      {s.total_capturas}x
                    </div>
                  )}

                  {/* Silhueta / Imagem */}
                  <div className="absolute inset-x-0 top-6 bottom-[35%] flex items-center justify-center p-6">
                    <img 
                      src={s.imagem_url || DEFAULT_FISH_IMG} 
                      alt={s.nome_comum}
                      className={`max-w-full max-h-full object-contain ${
                        isCaught ? 'drop-shadow-[0_0_15px_rgba(0,183,168,0.4)]' : 'opacity-30'
                      }`}
                      style={{ filter: (isCaught && s.imagem_url) ? 'none' : 'contrast(0) brightness(0.5)' }}
                    />
                  </div>

                  {/* Detalhes na base */}
                  <div className={`absolute bottom-0 inset-x-0 p-4 pt-10 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end`}>
                    <h3 className={`font-black uppercase tracking-wide leading-tight ${isCaught ? 'text-white' : 'text-gray-500'}`}>
                      {s.nome_comum}
                    </h3>
                    <p className={`text-[10px] font-mono mt-1 ${isCaught ? 'text-accent' : 'text-gray-600'}`}>
                      {s.nome_cientifico}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* MODAL FICHA TÉCNICA */}
      {selectedSpecies && (
        <div 
          className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm fade-in"
          onClick={() => setSelectedSpecies(null)}
        >
          <div 
            className="w-full max-w-lg bg-[#0F1318] sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Imagem de Fundo (Header do Card) */}
            <div className={`relative h-56 bg-gradient-to-br ${selectedSpecies.total_capturas > 0 ? 'from-[#052b2f] to-[#011417]' : 'from-gray-900 to-black'} p-6 flex flex-col justify-between`}>
              {/* Botão fechar (Mobile style swipe indicator) */}
              <div className="absolute top-2 inset-x-0 flex justify-center sm:hidden" onClick={() => setSelectedSpecies(null)}>
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>

              <div className="flex justify-between items-start pt-4 sm:pt-0">
                <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-white flex items-center gap-1.5 border border-white/10">
                  <MapPin size={12} className="text-accent" /> {selectedSpecies.habitat}
                </div>
                {selectedSpecies.total_capturas > 0 && (
                  <div className="bg-accent/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-accent flex items-center gap-1.5 border border-accent/30">
                    <Trophy size={12} /> Descoberto
                  </div>
                )}
              </div>

              {/* Imagem do peixe com drop shadow enorme */}
              <div className="absolute bottom-[-10%] inset-x-0 flex justify-center pointer-events-none">
                <img 
                  src={selectedSpecies.imagem_url || DEFAULT_FISH_IMG} 
                  alt={selectedSpecies.nome_comum}
                  className={`h-40 object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] ${selectedSpecies.total_capturas > 0 ? '' : 'brightness-50 grayscale'}`}
                />
              </div>
            </div>

            {/* Corpo Scrollável */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              
              {/* Título */}
              <div className="text-center mt-2">
                <h2 className="text-3xl font-black text-white tracking-tight uppercase leading-none">
                  {selectedSpecies.nome_comum}
                </h2>
                <p className="text-sm font-mono text-accent mt-2 opacity-80">
                  {selectedSpecies.nome_cientifico}
                </p>
              </div>

              {/* Status Pessoal */}
              {selectedSpecies.total_capturas > 0 ? (
                <div className="bg-[#161C23] p-4 rounded-2xl flex items-center justify-around border border-[#212730]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Maior Pego</span>
                    <span className="text-lg font-black text-white">{selectedSpecies.maior_tamanho_capturado_cm || '--'} cm</span>
                  </div>
                  <div className="w-[1px] h-8 bg-white/5" />
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Maior Peso</span>
                    <span className="text-lg font-black text-white">{selectedSpecies.maior_peso_capturado_kg || '--'} kg</span>
                  </div>
                  <div className="w-[1px] h-8 bg-white/5" />
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Capturas</span>
                    <span className="text-lg font-black text-accent">{selectedSpecies.total_capturas}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#161C23] px-4 py-3 rounded-xl flex items-center justify-center gap-2 border border-[#212730]/50 text-gray-400 text-sm font-medium">
                  <AlertCircle size={16} /> Você ainda não pescou esta espécie.
                </div>
              )}

              {/* Info Técnica & Dicas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Dica do Pro */}
                <div className="bg-gradient-to-br from-accent/10 to-transparent p-5 rounded-2xl border border-accent/20 flex flex-col gap-2 sm:col-span-2">
                  <div className="flex items-center gap-2 text-accent font-black text-xs uppercase tracking-wider">
                    <Info size={14} /> Dica Especializada
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">
                    {selectedSpecies.dica_pro || "Sem dicas catalogadas no momento."}
                  </p>
                  {selectedSpecies.isca_favorita && (
                    <div className="mt-2 text-xs font-bold text-gray-400 bg-black/20 px-3 py-2 rounded-lg inline-block self-start border border-white/5">
                      🎣 Iscas Favoritas: <span className="text-white">{selectedSpecies.isca_favorita}</span>
                    </div>
                  )}
                </div>

                {/* Info Recordes */}
                <div className="bg-[#161C23] p-4 rounded-2xl flex flex-col gap-2 border border-[#212730]">
                  <div className="text-[#F5A623] font-black text-xs uppercase flex items-center gap-1.5"><Trophy size={14} /> Potencial I.G.F.A</div>
                  <div className="text-sm text-gray-400">Pode ultrapassar <strong className="text-white">{selectedSpecies.tamanho_recorde_cm}cm</strong> e chegar a <strong className="text-white">{selectedSpecies.peso_recorde_kg}kg</strong>.</div>
                </div>

                {/* Legislação */}
                <div className="bg-[#161C23] p-4 rounded-2xl flex flex-col gap-2 border border-[#212730]">
                  <div className="text-[#ef4444] font-black text-xs uppercase flex items-center gap-1.5"><Scale size={14} /> Cota e Lei</div>
                  <div className="text-sm text-gray-400">Tamanho mínimo de abate: <strong className="text-white">{selectedSpecies.tamanho_minimo_cm || '--'}cm</strong>. Sempre pratique o "Pesque e Solte" quando possível.</div>
                </div>

              </div>
              
              <button 
                onClick={() => setSelectedSpecies(null)}
                className="w-full bg-white/5 hover:bg-white/10 active:bg-white/20 text-white font-bold py-4 rounded-xl transition-colors mt-auto hidden sm:block"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  )
}
