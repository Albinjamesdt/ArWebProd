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
