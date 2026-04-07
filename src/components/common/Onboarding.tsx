'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, ArrowRight, MapPin, 
  Fish, Award, Store, CheckCircle 
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

const onboardingData = [
  {
    id: 1,
    title: 'Explore os Melhores Pontos',
    description: 'Encontre pontos de pesca verificados pela comunidade e descubra os segredos de cada região no mapa dinâmico.',
    icon: MapPin,
    color: 'var(--color-accent-primary)',
    accent: '#00d4aa'
  },
  {
    id: 2,
    title: 'Registre suas Conquistas',
    description: 'Registre cada troféu, adicione fotos, pesagem e equipamento. Construa seu álbum de pesca e ganhe XP para subir de nível.',
    icon: Fish,
    color: 'var(--color-accent-warm)',
    accent: '#f59e0b'
  },
  {
    id: 3,
    title: 'Parceiros Oficiais',
    description: 'Localize pesqueiros oficiais no mapa para aproveitar promoções e torneios exclusivos. O FishMap te leva até os parceiros.',
    icon: Store,
    color: 'var(--color-accent-secondary)',
    accent: '#0ea5e9'
  },
  {
    id: 4,
    title: 'Sua Jornada Começa Agora',
    description: 'Pronto para fisgar os maiores exemplares? Junte-se a milhares de pescadores na maior rede de pesca do Brasil.',
    icon: CheckCircle,
    color: '#ffffff',
    accent: '#00d4aa',
    isLast: true
  }
]

interface OnboardingProps {
  onComplete: () => void
  user_id?: string
}

export default function Onboarding({ onComplete, user_id }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  
  const step = onboardingData[currentStep]
  const isLastStep = currentStep === onboardingData.length - 1

  const handleNext = async () => {
    if (isLastStep) {
      setLoading(true)
      try {
        if (user_id) {
          const supabase = getSupabaseClient()
          await (supabase.from('profiles') as any)
            .update({ has_seen_onboarding: true })
            .eq('id', user_id)
        }
        onComplete()
      } catch (err) {
        console.error('Erro ao atualizar onboarding:', err)
        onComplete() // Pelo menos deixa o usuário entrar
      } finally {
        setLoading(false)
      }
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleSkip = () => {
    handleNext() // Para pular, na verdade vai pro fim ou completa logo
    // No onboarding Skip costuma completar tudo
    setCurrentStep(onboardingData.length - 1)
  }

  const variants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-[#0F172A] flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full -z-10" />
        <div 
            className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-orange-500/5 blur-[100px] rounded-full -z-10" 
            style={{ backgroundColor: `${step.accent}10` }}
        />

        <div className="w-full max-w-lg space-y-12 flex flex-col items-center">
            
            {/* Header / Skip */}
            {!isLastStep && (
                <button 
                    onClick={handleSkip}
                    className="absolute top-10 right-6 text-slate-500 hover:text-white font-black text-xs uppercase tracking-[0.2em] transition-colors"
                >
                    Pular Tutorial
                </button>
            )}

            <AnimatePresence mode="wait">
                <motion.div 
                    key={currentStep}
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="flex flex-col items-center text-center space-y-6"
                >
                    {/* Animated Icon Container */}
                    <motion.div 
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="w-32 h-32 rounded-[40px] flex items-center justify-center relative group"
                        style={{ background: `linear-gradient(135deg, ${step.color}20, transparent)`, border: `1px solid ${step.color}40` }}
                    >
                        <div className="absolute inset-0 blur-2xl opacity-20 bg-current transition-colors" style={{ color: step.color }} />
                        <step.icon size={60} style={{ color: step.color }} className="drop-shadow-2xl" />
                    </motion.div>

                    <div className="space-y-4">
                        <motion.h2 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none"
                        >
                            {step.title}
                        </motion.h2>
                        <motion.p 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-slate-400 text-lg leading-relaxed max-w-sm mx-auto"
                        >
                            {step.description}
                        </motion.p>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Pagination Dots */}
            <div className="flex gap-2">
                {onboardingData.map((_, i) => (
                    <div 
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-cyan-400' : 'w-1.5 bg-slate-800'}`}
                    />
                ))}
            </div>

            {/* CTA Button */}
            <div className="w-full pt-8">
                <button
                    onClick={handleNext}
                    disabled={loading}
                    className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-lg uppercase tracking-tighter transition-all 
                        ${isLastStep 
                            ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-2xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98]' 
                            : 'bg-white text-slate-900 border-b-4 border-slate-200 hover:bg-slate-50'}`}
                >
                    {loading ? (
                        <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent animate-spin rounded-full" />
                    ) : isLastStep ? (
                        <>
                            <span>Começar minha jornada grátis</span>
                            <CheckCircle size={24} />
                        </>
                    ) : (
                        <>
                            <span>Avançar</span>
                            <ArrowRight size={22} />
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* Footer Brand */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-20 grayscale">
             <img src="/images/1f734841-ff76-4035-91f2-7af673684c92-removebg-preview.png" alt="Fishgada" className="h-6" />
             <span className="font-black italic text-sm tracking-tighter text-white">FISHGADA</span>
        </div>
    </div>
  )
}
