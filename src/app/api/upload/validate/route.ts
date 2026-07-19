import { NextResponse } from 'next/server'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado', valid: false },
        { status: 400 }
      )
    }

    const errors: string[] = []

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`Arquivo muito grande. Máximo permitido: ${MAX_FILE_SIZE / 1024 / 1024}MB. Enviado: ${(file.size / 1024 / 1024).toFixed(1)}MB`)
    }

    if (file.size === 0) {
      errors.push('Arquivo vazio')
    }

    // Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      errors.push(`Tipo de arquivo não permitido: ${file.type}. Permitidos: JPEG, PNG, WebP, AVIF`)
    }

    if (errors.length > 0) {
      return NextResponse.json({ valid: false, errors }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      size: file.size,
      type: file.type,
      name: file.name,
    })
  } catch (err: any) {
    console.error('Erro na validação de upload:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor', valid: false },
      { status: 500 }
    )
  }
}
