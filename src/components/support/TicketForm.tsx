'use client'

import React, { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle2, Upload, Send, HelpCircle, ArrowLeft } from 'lucide-react'

// Common categories based on the migration
const categories = [
  { value: 'bug', label: 'Bug / Erro' },
  { value: 'sugestão', label: 'Sugestão / Melhoria' },
  { value: 'elogio', label: 'Elogio' },
  { value: 'suporte_tecnico', label: 'Suporte Técnico' },
  { value: 'financeiro', label: 'Financeiro / Pagamentos' },
  { value: 'outro', label: 'Outro' },
]

const priorities = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'média', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

export default function TicketForm() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    category: 'outro',
    priority: 'média',
    subject: '',
    description: '',
  })
  
  const [file, setFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  const supabase = getSupabaseClient()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      let attachment_url = null
      
      // Upload file if exists
      if (file) {
        setUploadingFile(true)
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError, data } = await supabase.storage
          .from('support-attachments')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Error uploading file:', uploadError)
          throw new Error('Falha ao enviar anexo')
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('support-attachments')
          .getPublicUrl(fileName)
          
        attachment_url = publicUrl
        setUploadingFile(false)
      }

      // Create ticket
      const { error: ticketError } = await (supabase
        .from('support_tickets') as any)
        .insert({
          user_id: user.id,
          category: formData.category,
          priority: formData.priority,
          subject: formData.subject,
          description: formData.description,
          attachment_url
        })

      if (ticketError) throw ticketError

      setSuccess(true)
      setFormData({
        category: 'outro',
        priority: 'média',
        subject: '',
        description: '',
      })
      setFile(null)
      
      // Notify Admin (optional: this could be a server action or trigger)
      if (formData.priority === 'alta' || formData.priority === 'urgente') {
          // In a real app, I'd call a server action or edge function here
          console.log('Notificando administradores sobre ticket de alta prioridade...')
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao enviar ticket')
    } finally {
      setLoading(false)
      setUploadingFile(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in glass-elevated rounded-3xl">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="text-green-500 w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-white">Ticket Enviado!</h2>
        <p className="text-slate-400 mb-6">
          Sua mensagem foi recebida. Nossa equipe analisará e responderá o mais breve possível.
        </p>
        <button 
          onClick={() => setSuccess(false)}
          className="btn-primary"
        >
          Enviar Outro Ticket
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div className="glass-elevated p-6 md:p-8 rounded-3xl border-white/5 border relative overflow-hidden">
        {/* Glow effect background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] -z-10 rounded-full" />
        
        <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <HelpCircle className="text-cyan-400" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Suporte & Feedback</h2>
                <p className="text-xs text-slate-400">Conte-nos como podemos ajudar ou melhorar o FishMap</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label">Categoria</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="select"
                required
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="label">Prioridade</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="select"
                required
              >
                {priorities.map(prio => (
                  <option key={prio.value} value={prio.value}>{prio.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">Assunto</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Ex: Não consigo salvar minha captura"
              className="input"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="label">Descrição Detalhada</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={5}
              placeholder="Descreva o problema ou sugestão com o máximo de detalhes..."
              className="input resize-none py-4"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="label">Anexo (Opcional)</label>
            <div className="relative">
              <input
                type="file"
                id="attachment"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="attachment"
                className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all text-slate-400"
              >
                {file ? (
                  <div className="flex items-center gap-2 text-cyan-400 font-medium">
                    <CheckCircle2 size={20} />
                    <span>{file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={20} />
                    <span>Clique para enviar uma foto do erro</span>
                  </>
                )}
              </label>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || uploadingFile}
            className="btn-primary w-full shadow-cyan-500/20"
          >
            {loading ? (
              <>
                <div className="spinner-small" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Enviar Ticket</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
