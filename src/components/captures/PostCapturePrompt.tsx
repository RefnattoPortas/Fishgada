'use client'

import { useState } from 'react'
import { Heart, Camera, X, Check, ChevronRight } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'

interface PostCapturePromptProps {
  spotId: string | null
  captureId: string
  userId: string
  onClose: () => void
  onSkip: () => void
}

export default function PostCapturePrompt({
  spotId,
  captureId,
  userId,
  onClose,
  onSkip,
}: PostCapturePromptProps) {
  const [step, setStep] = useState<'prompt' | 'contribute' | 'done'>('prompt')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null)
  const [contribution, setContribution] = useState({
    photo: false,
    species: false,
    weight: false,
    bait: false,
    conditions: false,
    notes: false,
  })

  const handleFeedback = async (type: 'good' | 'bad') => {
    setFeedback(type)
    setStep('contribute')
  }

  const handleContribute = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const selectedFields = Object.entries(contribution)
        .filter(([, v]) => v)
        .map(([k]) => k)

      if (spotId && selectedFields.length > 0) {
        await (supabase.from('captures') as any).update({
          notes: contribution.notes ? 'Contribuição pós-captura' : undefined,
        }).eq('id', captureId)
      }

      trackEvent('capture_created', {
        source: 'post_capture_prompt',
        contributed: String(selectedFields.length > 0),
      })

      setStep('done')
    } catch {
      setStep('done')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="fixed inset-0 z-[1700] flex items-center justify-center bg-black/60">
        <div className="glass-elevated rounded-3xl p-8 max-w-sm mx-4 text-center fade-in">
          <div className="w-16 h-16 rounded-full bg-cyan-400/20 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-cyan-400" />
          </div>
          <h3 className="text-lg font-black text-white mb-2">Obrigado!</h3>
          <p className="text-sm text-gray-400 mb-6">
            Sua contribuição ajuda toda a comunidade de pescadores.
          </p>
          <button
            onClick={onClose}
            className="btn-primary w-full py-3 text-sm"
          >
            Continuar Explorando
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[1700] flex items-end md:items-center justify-center bg-black/60">
      <div className="glass-elevated rounded-t-3xl md:rounded-3xl p-6 max-w-md w-full mx-4 fade-in"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        {step === 'prompt' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-400/20 flex items-center justify-center mx-auto mb-4">
              <Heart size={28} className="text-amber-400" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">
              Captura registrada com sucesso!
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Ajude outros pescadores a conhecer este local.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex-1 py-3 rounded-xl text-[11px] font-bold text-gray-400 border border-white/10 hover:text-white transition-all"
              >
                Agora não
              </button>
              <button
                onClick={() => handleFeedback('good')}
                className="flex-[2] btn-primary py-3 text-[11px] font-black"
              >
                Quero contribuir
              </button>
            </div>
          </div>
        )}

        {step === 'contribute' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-black text-white">
                Contribuir com o local
              </h3>
              <button onClick={onSkip} aria-label="Fechar">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              O que você pode compartilhar sobre esta experiência?
            </p>

            <div className="space-y-2 mb-6">
              {[
                { key: 'photo', label: 'Foto da captura', icon: Camera },
                { key: 'species', label: 'Espécie', icon: null },
                { key: 'weight', label: 'Tamanho/Peso', icon: null },
                { key: 'bait', label: 'Isca utilizada', icon: null },
                { key: 'conditions', label: 'Condições da água/clima', icon: null },
                { key: 'notes', label: 'Observações', icon: null },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setContribution(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    contribution[key as keyof typeof contribution]
                      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-400'
                      : 'border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    contribution[key as keyof typeof contribution]
                      ? 'border-cyan-400 bg-cyan-400'
                      : 'border-gray-600'
                  }`}>
                    {contribution[key as keyof typeof contribution] && (
                      <Check size={12} className="text-black" />
                    )}
                  </div>
                  {Icon && <Icon size={16} />}
                  <span className="text-sm font-bold">{label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleContribute}
              disabled={loading || !Object.values(contribution).some(v => v)}
              className="btn-primary w-full py-3 text-sm font-black"
            >
              {loading ? 'Salvando...' : 'Compartilhar contribuição'}
            </button>
            <button
              onClick={onSkip}
              className="w-full py-3 mt-2 text-[11px] font-bold text-gray-500 hover:text-white transition-colors"
            >
              Pular, obrigado
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
