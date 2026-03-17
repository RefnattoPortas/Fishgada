/**
 * Script de migração WikiFish → Supabase
 * Aplica o schema SQL usando a Management API do Supabase
 * 
 * Uso: node scripts/migrate.js
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'qvqobnzldxsfovquhrmb'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
// A service key no novo formato precisa ser a legacy service_role JWT
// Vamos usar a API de SQL diretamente via fetch

const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`

// Lê o SQL de migração
const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '001_wikifish_schema.sql')
const sql = fs.readFileSync(sqlFile, 'utf8')

// Divide em statements individuais para execução mais confiável
// Mas vamos enviar tudo de uma vez via rpc
async function runMigration() {
  console.log('🎣 WikiFish — Aplicando migração no Supabase...')
  console.log(`📡 Projeto: ${PROJECT_REF}`)
  console.log(`🔗 URL: ${SUPABASE_URL}`)
  console.log('')

  const body = JSON.stringify({ query: sql })

  const options = {
    hostname: `${PROJECT_REF}.supabase.co`,
    port: 443,
    path: '/rest/v1/rpc/sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Length': Buffer.byteLength(body),
    }
  }

  // Abordagem alternativa: usar o endpoint de query do Supabase
  const dbOptions = {
    hostname: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
  }

  console.log('💡 Para aplicar a migração, siga os passos abaixo:')
  console.log('')
  console.log('1. Abra o Supabase Dashboard:')
  console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`)
  console.log('')
  console.log('2. Cole o conteúdo do arquivo:')
  console.log(`   ${sqlFile}`)
  console.log('')
  console.log('3. Clique em "Run"')
  console.log('')
  console.log('OU execute via psql:')
  console.log(`   psql "postgresql://postgres.${PROJECT_REF}:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" < ${sqlFile}`)
}

runMigration().catch(console.error)
