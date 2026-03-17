// Tipos TypeScript gerados a partir do schema do Supabase
// Em produção: gere via `npx supabase gen types typescript`

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          total_captures: number
          total_spots: number
          xp_points: number
          level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          total_captures?: number
          total_spots?: number
          xp_points?: number
          level?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      spots: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          privacy_level: 'public' | 'community' | 'private'
          community_unlock_captures: number
          water_type: 'river' | 'lake' | 'reservoir' | 'sea' | 'estuary' | 'other' | null
          depth_m: number | null
          access_difficulty: 'easy' | 'medium' | 'hard' | 'boat_only' | null
          photo_url: string | null
          is_verified: boolean
          verification_count: number
          fuzz_radius_m: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          privacy_level?: 'public' | 'community' | 'private'
          community_unlock_captures?: number
          water_type?: string | null
          depth_m?: number | null
          access_difficulty?: string | null
          photo_url?: string | null
          location: string // WKT ou coordenadas
          fuzz_radius_m?: number
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['spots']['Insert']>
      }
      captures: {
        Row: {
          id: string
          user_id: string
          spot_id: string | null
          species: string
          weight_kg: number | null
          length_cm: number | null
          photo_url: string | null
          is_trophy: boolean
          was_released: boolean
          captured_at: string
          moon_phase: string | null
          temperature_c: number | null
          water_temp_c: number | null
          weather: string | null
          wind_speed_kmh: number | null
          water_clarity: string | null
          tide: string | null
          time_of_day: string | null
          xp_awarded: number
          is_public: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          spot_id?: string | null
          species: string
          weight_kg?: number | null
          length_cm?: number | null
          photo_url?: string | null
          is_trophy?: boolean
          was_released?: boolean
          captured_at?: string
          moon_phase?: string | null
          temperature_c?: number | null
          water_temp_c?: number | null
          weather?: string | null
          wind_speed_kmh?: number | null
          water_clarity?: string | null
          tide?: string | null
          time_of_day?: string | null
          xp_awarded?: number
          is_public?: boolean
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['captures']['Insert']>
      }
      setups: {
        Row: {
          id: string
          capture_id: string
          user_id: string
          lure_type: string | null
          lure_model: string | null
          lure_color: string | null
          lure_size_cm: number | null
          lure_brand: string | null
          hook_size: string | null
          hook_type: string | null
          line_lb: number | null
          line_type: string | null
          line_brand: string | null
          rod_brand: string | null
          rod_model: string | null
          reel_brand: string | null
          reel_model: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          capture_id: string
          user_id: string
          lure_type?: string | null
          lure_model?: string | null
          lure_color?: string | null
          lure_size_cm?: number | null
          lure_brand?: string | null
          hook_size?: string | null
          hook_type?: string | null
          line_lb?: number | null
          line_type?: string | null
          line_brand?: string | null
          rod_brand?: string | null
          rod_model?: string | null
          reel_brand?: string | null
          reel_model?: string | null
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['setups']['Insert']>
      }
      interactions: {
        Row: {
          id: string
          user_id: string
          capture_id: string
          type: 'like' | 'comment' | 'verified'
          comment_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          capture_id: string
          type: 'like' | 'comment' | 'verified'
          comment_text?: string | null
        }
        Update: Partial<Database['public']['Tables']['interactions']['Insert']>
      }
    }
    Views: {
      spots_map_view: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          privacy_level: string
          fuzz_radius_m: number
          water_type: string | null
          is_verified: boolean
          verification_count: number
          community_unlock_captures: number
          created_at: string
          display_lng: number
          display_lat: number
          exact_lng: number
          exact_lat: number
          total_captures: number
          latest_lure_type: string | null
          latest_lure_model: string | null
          latest_lure_color: string | null
          photo_url: string | null
          owner_name: string | null
          owner_avatar: string | null
        }
      }
    }
    Functions: {
      can_user_see_exact_spot: {
        Args: { p_user_id: string; p_spot_id: string }
        Returns: boolean
      }
    }
  }
}

// Tipos auxiliares para uso na aplicação
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Spot = Database['public']['Tables']['spots']['Row']
export type Capture = Database['public']['Tables']['captures']['Row']
export type Setup = Database['public']['Tables']['setups']['Row']
export type Interaction = Database['public']['Tables']['interactions']['Row']
export type SpotMapView = Database['public']['Views']['spots_map_view']['Row']

export type LureType = 
  | 'topwater' | 'mid_water' | 'bottom' | 'jig' | 'soft_plastic'
  | 'crankbait' | 'spinnerbait' | 'natural_bait' | 'fly' | 'other'

export type PrivacyLevel = 'public' | 'community' | 'private'
export type WaterType = 'river' | 'lake' | 'reservoir' | 'sea' | 'estuary' | 'other'
export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night'
export type MoonPhase = 
  | 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous'
  | 'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent'
