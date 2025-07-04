import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://fydrjniligfkxnpahzto.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZHJqbmlsaWdma3hucGFoenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NDkzMTEsImV4cCI6MjA2NjMyNTMxMX0.xKCJmya4ANi-kEPoyg0QqZPPcMzFHFBt23R5N-oEyb0"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZHJqbmlsaWdma3hucGFoenRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc0OTMxMSwiZXhwIjoyMDY2MzI1MzExfQ.Hw7dDFIbO67rxqnBxPb9IY2-TismvIKzjhB_jfOibo0"

// Client-side Supabase client
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (admin)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Database types
export interface Marker {
  id: string
  title: string
  marker_image_path: string
  video_path: string
  created_at: string
}

export interface MarkerWithUrls {
  id: string
  title: string
  markerImageUrl: string
  videoUrl: string,
  targetUrl?: string,
  createdAt: string
}
