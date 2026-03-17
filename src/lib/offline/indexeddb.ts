/**
 * WikiFish Offline Sync — IndexedDB via idb
 * ==========================================
 * Salva pontos e capturas localmente quando offline.
 * Ao recuperar sinal, sincroniza com Supabase automaticamente.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// Schema do IndexedDB
interface FishMapOfflineDB {
  pending_spots: {
    key: string
    value: {
      id: string           // UUID local temporário
      user_id: string
      title: string
      description: string | null
      lat: number
      lng: number
      privacy_level: string
      water_type: string | null
      photo_url: string | null
      fuzz_radius_m: number
      created_locally_at: string
      synced: number
    }
    indexes: { 'by-synced': number }
  }
  pending_captures: {
    key: string
    value: {
      id: string
      user_id: string
      spot_id: string | null
      species: string
      weight_kg: number | null
      length_cm: number | null
      photo_url: string | null
      captured_at: string
      moon_phase: string | null
      temperature_c: number | null
      weather: string | null
      notes: string | null
      is_public: boolean
      // Setup vinculado
      setup?: {
        lure_type: string | null
        lure_model: string | null
        lure_color: string | null
        hook_size: string | null
        line_lb: number | null
        line_type: string | null
      }
      created_locally_at: string
      synced: number
    }
    indexes: { 'by-synced': number }
  }
  // Cache de spots próximos para uso offline
  spots_cache: {
    key: string
    value: {
      id: string
      title: string
      lat: number
      lng: number
      privacy_level: string
      water_type: string | null
      is_verified: boolean
      total_captures: number
      latest_lure_type: string | null
      cached_at: string
    }
  }
}

let db: IDBPDatabase<FishMapOfflineDB> | null = null

export async function getOfflineDB(): Promise<IDBPDatabase<FishMapOfflineDB>> {
  if (!db) {
    db = await openDB<FishMapOfflineDB>('wikifish-offline', 1, {
      upgrade(database) {
        // Store de spots pendentes
        const spotsStore = database.createObjectStore('pending_spots', {
          keyPath: 'id',
        })
        spotsStore.createIndex('by-synced', 'synced')

        // Store de capturas pendentes
        const capturesStore = database.createObjectStore('pending_captures', {
          keyPath: 'id',
        })
        capturesStore.createIndex('by-synced', 'synced')

        // Cache de spots para visualização offline
        database.createObjectStore('spots_cache', { keyPath: 'id' })
      },
    })
  }
  return db
}

// ─── SPOTS ────────────────────────────────────────────────────

export async function savePendingSpot(spot: Omit<FishMapOfflineDB['pending_spots']['value'], 'synced'>) {
  const database = await getOfflineDB()
  await database.put('pending_spots', { ...spot, synced: 0 })
  console.log('[Offline] Spot salvo localmente:', spot.id)
}

export async function getPendingSpots() {
  const database = await getOfflineDB()
  return database.getAllFromIndex('pending_spots', 'by-synced', 0)
}

export async function markSpotSynced(id: string) {
  const database = await getOfflineDB()
  const spot = await database.get('pending_spots', id)
  if (spot) {
    await database.put('pending_spots', { ...spot, synced: 1 })
  }
}

// ─── CAPTURES ─────────────────────────────────────────────────

export async function savePendingCapture(capture: Omit<FishMapOfflineDB['pending_captures']['value'], 'synced'>) {
  const database = await getOfflineDB()
  await database.put('pending_captures', { ...capture, synced: 0 })
  console.log('[Offline] Captura salva localmente:', capture.id)
}

export async function getPendingCaptures() {
  const database = await getOfflineDB()
  return database.getAllFromIndex('pending_captures', 'by-synced', 0)
}

export async function markCaptureSynced(id: string) {
  const database = await getOfflineDB()
  const capture = await database.get('pending_captures', id)
  if (capture) {
    await database.put('pending_captures', { ...capture, synced: 1 })
  }
}

// ─── CACHE DE SPOTS ──────────────────────────────────────────

export async function cacheSpots(spots: FishMapOfflineDB['spots_cache']['value'][]) {
  const database = await getOfflineDB()
  const tx = database.transaction('spots_cache', 'readwrite')
  await Promise.all([
    ...spots.map(spot => tx.store.put(spot)),
    tx.done,
  ])
}

export async function getCachedSpots(): Promise<FishMapOfflineDB['spots_cache']['value'][]> {
  const database = await getOfflineDB()
  return database.getAll('spots_cache')
}

// ─── SYNC ENGINE ─────────────────────────────────────────────

export async function syncPendingData(supabaseClient: any, userId: string) {
  const [pendingSpots, pendingCaptures] = await Promise.all([
    getPendingSpots(),
    getPendingCaptures(),
  ])

  let synced = 0
  let errors = 0

  // Sincronizar spots
  for (const spot of pendingSpots) {
    try {
      const { error } = await supabaseClient.from('spots').insert({
        user_id: userId,
        title: spot.title,
        description: spot.description,
        location: `SRID=4326;POINT(${spot.lng} ${spot.lat})`,
        privacy_level: spot.privacy_level,
        water_type: spot.water_type,
        photo_url: spot.photo_url,
        fuzz_radius_m: spot.fuzz_radius_m,
      })

      if (error) throw error
      await markSpotSynced(spot.id)
      synced++
    } catch (err) {
      console.error('[Sync] Erro ao sincronizar spot:', spot.id, err)
      errors++
    }
  }

  // Sincronizar capturas
  for (const capture of pendingCaptures) {
    try {
      const { data: captureData, error: captureError } = await supabaseClient
        .from('captures')
        .insert({
          user_id: userId,
          spot_id: capture.spot_id,
          species: capture.species,
          weight_kg: capture.weight_kg,
          length_cm: capture.length_cm,
          photo_url: capture.photo_url,
          captured_at: capture.captured_at,
          moon_phase: capture.moon_phase,
          temperature_c: capture.temperature_c,
          weather: capture.weather,
          notes: capture.notes,
          is_public: capture.is_public,
        })
        .select()
        .single()

      if (captureError) throw captureError

      // Sincronizar setup vinculado
      if (capture.setup && captureData) {
        await supabaseClient.from('setups').insert({
          capture_id: captureData.id,
          user_id: userId,
          ...capture.setup,
        })
      }

      await markCaptureSynced(capture.id)
      synced++
    } catch (err) {
      console.error('[Sync] Erro ao sincronizar captura:', capture.id, err)
      errors++
    }
  }

  return {
    synced,
    errors,
    total: pendingSpots.length + pendingCaptures.length,
  }
}

// ─── CONTADOR DE PENDENTES ───────────────────────────────────

export async function getPendingCount(): Promise<number> {
  const [spots, captures] = await Promise.all([
    getPendingSpots(),
    getPendingCaptures(),
  ])
  return spots.length + captures.length
}
