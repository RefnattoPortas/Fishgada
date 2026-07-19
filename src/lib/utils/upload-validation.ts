const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateFileClient(file: File): ValidationResult {
  const errors: string[] = []

  if (file.size > MAX_SIZE) {
    errors.push(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 10MB`)
  }

  if (file.size === 0) {
    errors.push('Arquivo vazio')
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push(`Formato não suportado: ${file.type || 'desconhecido'}. Use JPEG, PNG, WebP ou AVIF`)
  }

  return { valid: errors.length === 0, errors }
}

export async function validateFileServer(file: File): Promise<ValidationResult> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload/validate', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) {
      return { valid: false, errors: data.errors || [data.error || 'Erro na validação'] }
    }

    return { valid: true, errors: [] }
  } catch {
    return { valid: false, errors: ['Erro de conexão ao validar arquivo'] }
  }
}
