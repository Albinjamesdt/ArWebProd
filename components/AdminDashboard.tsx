// components\admin-panel.tsx
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
import { Trash2, Eye, Upload, BarChart3, Zap, ExternalLink, Copy, Loader } from "lucide-react"
import type { MarkerWithUrls } from "@/lib/supabase-client"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
 
 

export default function AdminDashboard() {
   // 1) ALL hooks at the top, unconditionally:
  const { data: session, status } = useSession()
  const [markers, setMarkers] = useState<MarkerWithUrls[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [targetInstructions, setTargetInstructions] = useState<any>(null)
  const [uploadProgress, setUploadProgress] = useState("")
 const router=useRouter()
// 2) Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/admin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadMarkers()
    }
  }, [status])

  // 2) Early UI guards, *after* your hooks:
  if (status === "loading") {
    return <div className="text-center mt-20">Loading panel…</div>
  }
  if (!session) {
    // you can show a redirect spinner or just null
    return null
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

  const generateTargetsAfterUpload = async () => {
    try {

      // Download all marker images and upload them to /api/generate-targets-file
      const markerFiles = await Promise.all(
        markers.map(async (marker) => {
          const response = await fetch(marker.markerImageUrl)
          if (!response.ok) throw new Error("Failed to download marker image")
          const blob = await response.blob()
          // Use marker title or id for filename
          const filename = `${marker.title || marker.id}.png`
          return new File([blob], filename, { type: blob.type })
        })
      )

      // Prepare FormData with all marker files
      const formData = new FormData()
      markerFiles.forEach((file) => {
        formData.append("markerImages", file)
      })

      console.log("Uploading marker images for targets generation:", markerFiles)

      setUploadProgress("Uploading all marker images for AR target generation...")

      const uploadResponse = await fetch("/api/generate-targets-file", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json()
        throw new Error(data.error || "Failed to upload marker images for targets generation")
      }


      const data = await uploadResponse.json()
      console.log("Targets generation response:", data)
    } catch (err) {
      console.error("Generate targets error:", err)
      setUploadProgress("⚠️ Targets generation failed, but marker was uploaded successfully.")
      // Don't show error here as the main upload was successful
    }
  }

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUploading(true)
    setError(null)
    setSuccess(null)
    setTargetInstructions(null)
    setUploadProgress("")

    const formData = new FormData(event.currentTarget)

    try {
      // Step 1: Upload the marker
      setUploadProgress("Uploading marker and video...")

      const response = await fetch("/api/markers", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Upload failed")
      }

      const data = await response.json()

      // Step 2: Reload markers
      setUploadProgress("Refreshing content...")
      await loadMarkers()

      if (markers.length > 0) {
        // Step 3: Generate targets after upload
        console.log("Generating targets after upload...")
        await generateTargetsAfterUpload()
      }

      setSuccess(`Marker "${data.title}" uploaded successfully!`)
      ;(event.target as HTMLFormElement).reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      console.error("Upload error:", err)
      setUploadProgress("")
    } finally {
      setUploading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess("Copied to clipboard!")
    setTimeout(() => setSuccess(null), 2000)
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
            <Button onClick={() => signOut({ callbackUrl: "/admin" })} variant="outline">
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

        {/* Upload Progress */}
        {uploadProgress && (
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <Loader className="w-4 h-4 animate-spin" />
            <AlertDescription className="text-blue-800">{uploadProgress}</AlertDescription>
          </Alert>
        )}

        {/* Target Generation Instructions - Only show after upload */}
        {targetInstructions && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Zap className="w-5 h-5" />
                AR Targets Ready - Complete Setup
              </CardTitle>
              <CardDescription className="text-blue-600">
                Your marker was uploaded successfully! Complete the AR setup by following these steps:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold mb-2">Quick Setup Steps:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  {targetInstructions.steps.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold mb-2">Your Marker Image:</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <Input value={targetInstructions.markerImageUrl} readOnly className="text-xs" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(targetInstructions.markerImageUrl)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={() => window.open(targetInstructions.markerImageUrl, "_blank")}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Image
                  </Button>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold mb-2">MindAR Compiler:</h4>
                  <Button
                    onClick={() => window.open(targetInstructions.compilerUrl, "_blank")}
                    className="w-full"
                    variant="outline"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Compiler Tool
                  </Button>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Next:</strong> After downloading the targets.mind file from the compiler, upload it to your
                  Supabase storage bucket named "targets" with the filename "targets.mind". Your AR experience will then
                  be ready to use!
                </p>
              </div>

              <Button onClick={() => setTargetInstructions(null)} variant="outline" className="w-full">
                Got it, hide instructions
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upload Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Add New AR Content
            </CardTitle>
            <CardDescription>
              Upload a marker image and video - AR targets will be generated automatically
            </CardDescription>
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
                {/* <div>
                  <Label htmlFor="videoUrl">Or Video URL</Label>
                  <Input id="videoUrl" name="videoUrl" placeholder="https://example.com/video.mp4" />
                </div> */}
              </div>

              <Button type="submit" disabled={uploading} className="w-full">
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    {uploadProgress || "Processing..."}
                  </div>
                ) : (
                  "Add AR Content & Generate Targets"
                )}
              </Button>

              {uploading && (
                <div className="text-sm text-gray-600 text-center">
                  This process includes uploading your content and preparing AR targets automatically
                </div>
              )}
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
                <p className="text-sm text-gray-500">
                  AR targets will be generated automatically when you add content.
                </p>
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
