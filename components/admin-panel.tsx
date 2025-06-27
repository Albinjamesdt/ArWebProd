"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Eye, Upload, BarChart3, Zap } from "lucide-react"
import type { MarkerWithUrls } from "@/lib/supabase-client"

export default function AdminPanel() {
  const [markers, setMarkers] = useState<MarkerWithUrls[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")

  const handleLogin = () => {
    if (password === "admin123") {
      setIsAuthenticated(true)
      setError(null)
    } else {
      setError("Invalid password")
    }
  }

  const loadMarkers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/markers")

      if (!response.ok) {
        throw new Error("Failed to load markers")
      }

      const data = await response.json()
      setMarkers(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError("Failed to load markers")
      console.error("Load markers error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUploading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch("/api/markers", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Upload failed")
      }

      const data = await response.json()
      setSuccess(`Marker "${data.title}" uploaded successfully!`)
      await loadMarkers()
      ;(event.target as HTMLFormElement).reset()

      // Auto-generate targets after upload
      try {
        await fetch("/api/generate-targets-file", { method: "POST" })
      } catch (err) {
        console.log("Auto-target generation failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      console.error("Upload error:", err)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    try {
      const response = await fetch(`/api/markers/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Delete failed")
      }

      setSuccess(`Marker "${title}" deleted successfully!`)
      await loadMarkers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
      console.error("Delete error:", err)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadMarkers()
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>Enter password to manage AR content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter admin password"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">WebAR Content Manager</h1>
            <p className="text-gray-600">Manage your AR markers and video content</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.open("/", "_blank")} variant="outline">
              View AR Experience
            </Button>
            <Button onClick={() => setIsAuthenticated(false)} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Upload Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Add New AR Content
            </CardTitle>
            <CardDescription>Upload a marker image and its associated video content</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Content Title</Label>
                  <Input id="title" name="title" placeholder="e.g., Product Advertisement" required />
                </div>
                <div>
                  <Label htmlFor="markerImage">Marker Image</Label>
                  <Input id="markerImage" name="markerImage" type="file" accept="image/*" required />
                </div>
                <div>
                  <Label htmlFor="video">Video File</Label>
                  <Input id="video" name="video" type="file" accept="video/*" />
                </div>
                <div>
                  <Label htmlFor="videoUrl">Or Video URL</Label>
                  <Input id="videoUrl" name="videoUrl" placeholder="https://example.com/video.mp4" />
                </div>
              </div>
              <Button type="submit" disabled={uploading} className="w-full">
                {uploading ? "Uploading..." : "Add AR Content"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{markers.length}</p>
                  <p className="text-sm text-gray-600">Active Markers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{markers.length > 0 ? "Ready" : "Setup"}</p>
                  <p className="text-sm text-gray-600">AR Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">Live</p>
                  <p className="text-sm text-gray-600">System Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content List */}
        <Card>
          <CardHeader>
            <CardTitle>AR Content Library</CardTitle>
            <CardDescription>
              {markers.length} piece{markers.length !== 1 ? "s" : ""} of AR content
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading content...</div>
            ) : markers.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No AR Content Yet</h3>
                <p className="text-gray-600 mb-4">Upload your first marker image and video to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {markers.map((marker) => (
                  <Card key={marker.id} className="overflow-hidden">
                    <div className="aspect-video bg-gray-100">
                      <img
                        src={marker.markerImageUrl || "/placeholder.svg"}
                        alt={marker.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 truncate">{marker.title}</h3>
                      <Badge variant="secondary" className="mb-3">
                        {new Date(marker.createdAt).toLocaleDateString()}
                      </Badge>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                              <Eye className="w-4 h-4 mr-1" />
                              Preview
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{marker.title}</DialogTitle>
                              <DialogDescription>AR content preview</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Marker Image:</h4>
                                <img
                                  src={marker.markerImageUrl || "/placeholder.svg"}
                                  alt={marker.title}
                                  className="w-full max-w-md mx-auto rounded-lg border"
                                />
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Video Content:</h4>
                                <video src={marker.videoUrl} controls className="w-full max-w-md mx-auto rounded-lg" />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(marker.id, marker.title)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
