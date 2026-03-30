// Tipos TypeScript gerados a partir do schema do Supabase
// Ajustados para evitar erros de referência recursiva circular no IDE

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
          subscription_tier: 'free' | 'pro' | 'partner'
          country: string | null
          state: string | null
          city: string | null
          total_likes: number
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
          country?: string | null
          state?: string | null
          city?: string | null
          total_likes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          total_captures?: number
          total_spots?: number
          xp_points?: number
          level?: number
          country?: string | null
          state?: string | null
          city?: string | null
          total_likes?: number
          created_at?: string
          updated_at?: string
        }
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
          location: string
          fuzz_radius_m?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          privacy_level?: 'public' | 'community' | 'private'
          community_unlock_captures?: number
          water_type?: string | null
          depth_m?: number | null
          access_difficulty?: string | null
          photo_url?: string | null
          location?: string
          fuzz_radius_m?: number
          is_active?: boolean
        }
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
        Update: {
          id?: string
          user_id?: string
          spot_id?: string | null
          species?: string
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
        Update: {
          id?: string
          capture_id?: string
          user_id?: string
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
        Update: {
          id?: string
          user_id?: string
          capture_id?: string
          type?: 'like' | 'comment' | 'verified'
          comment_text?: string | null
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      achievements: {
        Row: { id: string; code: string; name: string; description: string | null; icon_name: string | null; created_at: string }
        Insert: { id?: string; code: string; name: string; description?: string | null; icon_name?: string | null }
        Update: { id?: string; code?: string; name?: string; description?: string | null; icon_name?: string | null }
      }
      user_achievements: {
        Row: { id: string; user_id: string; achievement_id: string; earned_at: string }
        Insert: { id?: string; user_id: string; achievement_id: string }
        Update: { id?: string; user_id?: string; achievement_id?: string }
      }
      fishing_resorts: {
        Row: { 
          id: string; 
          spot_id: string; 
          owner_id: string; 
          infrastructure: Json; 
          opening_hours: string | null; 
          prices: Json; 
          phone: string | null; 
          is_partner: boolean; 
          is_active: boolean;
          active_highlight: string | null;
          notice_board: string | null;
          photos: string[] | null;
          instagram: string | null;
          website: string | null;
          main_species: string[] | null;
          created_at: string 
        }
        Insert: { 
          id?: string; 
          spot_id: string; 
          owner_id: string; 
          infrastructure?: Json; 
          opening_hours?: string | null; 
          prices?: Json; 
          phone?: string | null; 
          is_partner?: boolean;
          is_active?: boolean;
          active_highlight?: string | null;
          notice_board?: string | null;
          photos?: string[] | null;
          instagram?: string | null;
          website?: string | null;
          main_species?: string[] | null;
        }
        Update: { 
          id?: string; 
          spot_id?: string; 
          owner_id?: string; 
          infrastructure?: Json; 
          opening_hours?: string | null; 
          prices?: Json; 
          phone?: string | null; 
          is_partner?: boolean;
          is_active?: boolean;
          active_highlight?: string | null;
          notice_board?: string | null;
          photos?: string[] | null;
          instagram?: string | null;
          website?: string | null;
          main_species?: string[] | null;
        }
      }
      tournaments: {
        Row: { id: string; resort_id: string; title: string; event_date: string; status: 'open' | 'ongoing' | 'closed'; created_at: string }
        Insert: { id?: string; resort_id: string; title: string; event_date: string; status?: 'open' | 'ongoing' | 'closed' }
        Update: { id?: string; resort_id?: string; title?: string; event_date?: string; status?: 'open' | 'ongoing' | 'closed' }
      }
      tournament_participants: {
        Row: { id: string; tournament_id: string; user_id: string; registered_at: string }
        Insert: { id?: string; tournament_id: string; user_id: string }
        Update: { id?: string; tournament_id?: string; user_id?: string }
      }
      species: {
        Row: {
          id: string
          nome_comum: string
          nome_cientifico: string
          habitat: string
          tamanho_recorde_cm: number | null
          peso_recorde_kg: number | null
          isca_favorita: string | null
          dica_pro: string | null
          tamanho_minimo_cm: number | null
          imagem_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome_comum: string
          nome_cientifico: string
          habitat: string
          tamanho_recorde_cm?: number | null
          peso_recorde_kg?: number | null
          isca_favorita?: string | null
          dica_pro?: string | null
          tamanho_minimo_cm?: number | null
          imagem_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome_comum?: string
          nome_cientifico?: string
          habitat?: string
          tamanho_recorde_cm?: number | null
          peso_recorde_kg?: number | null
          isca_favorita?: string | null
          dica_pro?: string | null
          tamanho_minimo_cm?: number | null
          imagem_url?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      resort_leads: {
        Row: {
          id: string
          owner_name: string
          resort_name: string
          phone: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          owner_name: string
          resort_name: string
          phone: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          owner_name?: string
          resort_name?: string
          phone?: string
          status?: string
          created_at?: string
        }
      }
    }
    Views: {
      spots_map_view: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          photo_url: string | null
          display_lat: number
          display_lng: number
          exact_lat: number | null
          exact_lng: number | null
          is_resort: boolean
          is_resort_partner: boolean
          water_type: string | null
          privacy_level: string
          total_captures: number
          resort_active_highlight: string | null
          opening_hours: string | null
          phone: string | null
          resort_notice_board: string | null
          resort_infrastructure: Json | null
          resort_prices: Json | null
          open_tournaments_count: number
          latest_lure_type: string | null
          latest_lure_model: string | null
          latest_lure_color: string | null
          is_verified: boolean
          fuzz_radius_m: number
          verification_count: number
          community_unlock_captures: number
          created_at: string
          owner_name: string | null
          owner_avatar: string | null
          resort_id: string | null
          resort_main_species: string | null
          instagram: string | null
          website: string | null
          searchable_species: string | null
        }
      }
      user_species_album: {
        Row: {
          species_id: string
          nome_comum: string
          nome_cientifico: string
          habitat: string
          tamanho_recorde_cm: number | null
          peso_recorde_kg: number | null
          isca_favorita: string | null
          dica_pro: string | null
          tamanho_minimo_cm: number | null
          imagem_url: string | null
          user_id: string | null
          total_capturas: number
          maior_tamanho_capturado_cm: number | null
          maior_peso_capturado_kg: number | null
          ultima_captura: string | null
        }
      }
    }
    Functions: { [_: string]: any }
    Enums: { [_: string]: any }
    CompositeTypes: { [_: string]: any }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Spot = Database['public']['Tables']['spots']['Row']
export type Capture = Database['public']['Tables']['captures']['Row']
export type Setup = Database['public']['Tables']['setups']['Row']
export type Interaction = Database['public']['Tables']['interactions']['Row']
export type SpotMapView = Database['public']['Views']['spots_map_view']['Row']
export type Species = Database['public']['Tables']['species']['Row']
export type SpeciesAlbum = Database['public']['Views']['user_species_album']['Row']
