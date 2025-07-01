"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Scan,
  AlertCircle,
  CheckCircle,
  Play,
  Loader,
  Upload,
  Zap,
} from "lucide-react";
import type { MarkerWithUrls } from "@/lib/supabase-client";

declare global {
  interface Window {
    AFRAME: any;
    MINDAR: any;
  }
}

export default function ProductionARViewer() {
  const [markers, setMarkers] = useState<MarkerWithUrls[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [arInitialized, setArInitialized] = useState(false);
  const [currentPlayingVideo, setCurrentPlayingVideo] = useState<string | null>(
    null
  );
  const [currentMarkerInfo, setCurrentMarkerInfo] =
    useState<MarkerWithUrls | null>(null);
  const [targetsGenerated, setTargetsGenerated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const arContainerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(
          userAgent
        );
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const loadMarkers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/markers");

      if (!response.ok) {
        throw new Error("Failed to load markers");
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        setMarkers(data);
        setError(null);
        console.log(`Loaded ${data.length} production markers`);
        await generateTargetsFile();
      } else {
        setMarkers([]);
        setError(null);
      }
    } catch (err) {
      console.error("Load markers error:", err);
      setError("Failed to load markers");
      setMarkers([]);
    } finally {
      setLoading(false);
    }
  };

  const generateTargetsFile = async () => {
    try {
      const response = await fetch("/api/generate-targets-file", {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Targets generated for production:", result);
        setTargetsGenerated(true);
      }
    } catch (err) {
      console.error("Target generation error:", err);
    }
  };

  const startCamera = async () => {
    try {
      // Mobile-optimized camera constraints
      const constraints = {
        video: {
          facingMode: "environment",
          width: isMobile
            ? { ideal: 720, min: 480 }
            : { ideal: 1280, min: 640 },
          height: isMobile
            ? { ideal: 1280, min: 640 }
            : { ideal: 720, min: 480 },
          aspectRatio: isMobile ? { ideal: 0.75 } : { ideal: 1.777 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = false;

        // Mobile-specific video settings
        if (isMobile) {
          videoRef.current.setAttribute("webkit-playsinline", "true");
          videoRef.current.setAttribute("playsinline", "true");
        }

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
          setError(null);
        };

        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError(`Camera access failed: ${(err as Error).message}`);
    }
  };

  const loadARScripts = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.AFRAME && window.MINDAR) {
        resolve();
        return;
      }

      const aframeScript = document.createElement("script");
      aframeScript.src = "https://aframe.io/releases/1.4.0/aframe.min.js";
      aframeScript.onload = () => {
        setTimeout(() => {
          const mindarScript = document.createElement("script");
          mindarScript.src =
            "https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image-aframe.prod.js";
          mindarScript.onload = () => setTimeout(resolve, 2000);
          mindarScript.onerror = reject;
          document.head.appendChild(mindarScript);
        }, 1000);
      };
      aframeScript.onerror = reject;
      document.head.appendChild(aframeScript);
    });
  };

  const initializeAR = async () => {
    if (!cameraReady || markers.length === 0 || !targetsGenerated) {
      return;
    }

    try {
      await loadARScripts();

      if (arContainerRef.current) {
        arContainerRef.current.innerHTML = "";

        const scene = document.createElement("a-scene");

        // Mobile-optimized MindAR settings
        const mindARSettings = isMobile
          ? "imageTargetSrc:  https://fydrjniligfkxnpahzto.supabase.co/storage/v1/object/sign/targets/targets.mind?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wNWVkNTBmMC1mOWQzLTQ2ZDUtOGQ3Ny1hZjBhNTJhNzBlNTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0YXJnZXRzL3RhcmdldHMubWluZCIsImlhdCI6MTc1MTAyNzYyOCwiZXhwIjoxNzUxNjMyNDI4fQ.bV_JAFzKGtLrl-nMuvM7-N-HsSNU7ZEFdQj96wR-iYg; autoStart: false; uiLoading: no; uiError: no; uiScanning: no; maxTrack: 1; warmupTolerance: 2; missTolerance: 2;"
          : "imageTargetSrc:  https://fydrjniligfkxnpahzto.supabase.co/storage/v1/object/sign/targets/targets.mind?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wNWVkNTBmMC1mOWQzLTQ2ZDUtOGQ3Ny1hZjBhNTJhNzBlNTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0YXJnZXRzL3RhcmdldHMubWluZCIsImlhdCI6MTc1MTAyNzYyOCwiZXhwIjoxNzUxNjMyNDI4fQ.bV_JAFzKGtLrl-nMuvM7-N-HsSNU7ZEFdQj96wR-iYg; autoStart: false; uiLoading: no; uiError: no; uiScanning: no;";
        // Use production targets file

        scene.setAttribute("mindar-image", mindARSettings);
        scene.setAttribute("embedded", "true");
        scene.setAttribute(
          "renderer",
          "colorManagement: true, physicallyCorrectLights: true"
        );

        // Mobile-specific scene settings
        if (isMobile) {
          scene.setAttribute("vr-mode-ui", "enabled: false");
          scene.setAttribute(
            "device-orientation-permission-ui",
            "enabled: false"
          );
        }

        scene.style.position = "absolute";
        scene.style.top = "0";
        scene.style.left = "0";
        scene.style.width = "100%";
        scene.style.height = "100%";
        scene.style.zIndex = "2";

        const camera = document.createElement("a-camera");
        camera.setAttribute("position", "0 0 0");

        // Mobile camera adjustments
        if (isMobile) {
          camera.setAttribute("look-controls", "enabled: false");
          camera.setAttribute("wasd-controls", "enabled: false");
        }

        scene.appendChild(camera);

        const assets = document.createElement("a-assets");

        // Add all production videos with mobile optimization
        markers.forEach((marker, index) => {
          const video = document.createElement("video");
          video.id = `productionVideo_${index}`;
          video.src = marker.videoUrl;
          video.setAttribute("preload", "auto");
          video.setAttribute("loop", "true");
          video.setAttribute("crossorigin", "anonymous");
          video.setAttribute("playsinline", "true");

          // Mobile-specific video attributes
          if (isMobile) {
            video.setAttribute("webkit-playsinline", "true");
            video.setAttribute("muted", "false");
            video.setAttribute("autoplay", "false");
          }

          video.muted = false;

          video.onloadeddata = () => {
            console.log(`Production video loaded: ${marker.title}`);
          };

          video.onerror = (e) => {
            console.error(
              `Production video failed to load: ${marker.title}`,
              e
            );
          };

          assets.appendChild(video);
        });

        scene.appendChild(assets);

        // Create target anchors for each production marker with mobile-optimized positioning
        markers.forEach((marker, index) => {
          const anchor = document.createElement("a-entity");
          anchor.setAttribute("mindar-image-target", `targetIndex: ${index}`);

          const plane = document.createElement("a-plane");
          plane.setAttribute("src", `#productionVideo_${index}`);

          // Mobile-optimized positioning and sizing

          // Desktop positioning
          plane.setAttribute("position", "0 0 0");
          plane.setAttribute("height", "0.552");
          plane.setAttribute("width", "1");
          plane.setAttribute("rotation", "0 0 0");

          plane.setAttribute("material", "transparent: true; alphaTest: 0.1;");
          plane.setAttribute("geometry", "primitive: plane");

          anchor.appendChild(plane);

          anchor.addEventListener("targetFound", () => {
            console.log(`Production marker detected: ${marker.title}`);
            setCurrentPlayingVideo(marker.id);
            setCurrentMarkerInfo(marker);

            // Stop all other videos
            markers.forEach((_, otherIndex) => {
              if (otherIndex !== index) {
                const otherVideo = document.getElementById(
                  `productionVideo_${otherIndex}`
                ) as HTMLVideoElement;
                if (otherVideo) {
                  otherVideo.pause();
                }
              }
            });

            // Play current video with mobile-specific handling
            const videoElement = document.getElementById(
              `productionVideo_${index}`
            ) as HTMLVideoElement;
            if (videoElement) {
              if (isMobile) {
                // Mobile-specific play handling
                videoElement.muted = false;
                videoElement.play().catch((error) => {
                  console.log(
                    "Mobile video play failed, trying with user interaction:",
                    error
                  );
                  // For mobile, sometimes we need user interaction
                  setTimeout(() => {
                    videoElement.play().catch(console.error);
                  }, 100);
                });
              } else {
                videoElement.play().catch(console.error);
              }
            }

            showDetectionFeedback(`Now Playing: ${marker.title}`);
            logAnalytics(marker.id);
          });

          anchor.addEventListener("targetLost", () => {
            console.log(`Production marker lost: ${marker.title}`);
            setCurrentPlayingVideo(null);
            setCurrentMarkerInfo(null);

            const videoElement = document.getElementById(
              `productionVideo_${index}`
            ) as HTMLVideoElement;
            if (videoElement) {
              videoElement.pause();
            }
          });

          scene.appendChild(anchor);
        });

        scene.addEventListener("loaded", () => {
          console.log("Production AR Scene loaded");
          setArInitialized(true);
          setError(null);

          setTimeout(
            () => {
              try {
                const aframeScene = scene as any;
                if (
                  aframeScene &&
                  aframeScene.systems &&
                  aframeScene.systems["mindar-image-system"]
                ) {
                  (aframeScene.systems["mindar-image-system"] as {
                    start: () => void;
                  }).start();
                }
              } catch (startError) {
                console.error("Error starting production AR:", startError);
                setError("Failed to start AR system");
              }
            },
            isMobile ? 2000 : 1500
          ); // Longer delay for mobile
        });

        arContainerRef.current.appendChild(scene);
      }
    } catch (err) {
      console.error("Production AR initialization error:", err);
      setError("AR initialization failed");
    }
  };

  const showDetectionFeedback = (message: string) => {
    const feedback = document.createElement("div");
    feedback.style.position = "fixed";
    feedback.style.top = isMobile ? "15%" : "20%";
    feedback.style.left = "50%";
    feedback.style.transform = "translateX(-50%)";
    feedback.style.background = "rgba(34, 197, 94, 0.95)";
    feedback.style.color = "white";
    feedback.style.padding = isMobile ? "12px 20px" : "16px 24px";
    feedback.style.borderRadius = "12px";
    feedback.style.zIndex = "1000";
    feedback.style.fontSize = isMobile ? "14px" : "16px";
    feedback.style.fontWeight = "600";
    feedback.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)";
    feedback.style.maxWidth = isMobile ? "80%" : "auto";
    feedback.style.textAlign = "center";
    feedback.textContent = message;

    document.body.appendChild(feedback);

    setTimeout(() => {
      if (document.body.contains(feedback)) {
        document.body.removeChild(feedback);
      }
    }, 3000);
  };

  const logAnalytics = async (markerId: string) => {
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markerId,
          userAgent: navigator.userAgent,
          ipAddress: "unknown",
        }),
      });
    } catch (err) {
      console.error("Analytics logging failed:", err);
    }
  };

  useEffect(() => {
    loadMarkers();
  }, []);

  useEffect(() => {
    if (markers.length > 0) {
      startCamera();
    }
  }, [markers, isMobile]);

  useEffect(() => {
    if (cameraReady && markers.length > 0 && targetsGenerated) {
      initializeAR();
    }
  }, [cameraReady, markers, targetsGenerated, isMobile]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader className="w-8 h-8 animate-spin mb-4 text-blue-400" />
            <h3 className="text-white font-semibold mb-2">Loading WebAR</h3>
            <p className="text-center text-gray-400">
              Preparing your AR experience...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (markers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Upload className="w-16 h-16 mb-6 text-gray-400" />
            <h3 className="text-white font-semibold mb-3 text-xl text-center">
              No Content Available
            </h3>
            <p className="text-gray-400 text-center mb-6 text-sm">
              Please upload your marker images and videos to start using the AR
              experience.
            </p>
            <Button
              onClick={() => (window.location.href = "/admin")}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Go to Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black relative overflow-hidden">
      {/* Camera Preview */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline 
        webkit-playsinline="true"
        style={{ zIndex: 1 }}
      />

      {/* AR Container */}
      <div
        ref={arContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 2 }}
      />

      {/* Loading States */}
      {!cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10 p-4">
          <Card className="bg-black/70 border-gray-700 w-full max-w-sm">
            <CardContent className="p-6 text-center">
              <Camera className="w-12 h-12 mx-auto mb-4 text-blue-400" />
              <h3 className="text-white font-semibold mb-2">Starting Camera</h3>
              <p className="text-gray-400 text-sm">
                Please allow camera access to continue
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {cameraReady && !arInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10 p-4">
          <Card className="bg-black/70 border-gray-700 w-full max-w-sm">
            <CardContent className="p-6 text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
              <h3 className="text-white font-semibold mb-2">Initializing AR</h3>
              <p className="text-gray-400 text-sm">
                {targetsGenerated
                  ? `Loading ${markers.length} markers`
                  : "Generating AR targets..."}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* UI Overlay - Mobile Optimized */}
      <div
        className={`absolute top-0 left-0 right-0 p-${
          isMobile ? "2" : "4"
        } z-20`}
      >
        <div
          className={`flex justify-between items-start gap-${
            isMobile ? "2" : "4"
          }`}
        >
          <Card className="bg-black/80 border-gray-700 flex-1">
            <CardContent className={`p-${isMobile ? "2" : "3"}`}>
              <div
                className={`flex items-center gap-2 text-${
                  isMobile ? "xs" : "sm"
                } text-white`}
              >
                <Camera
                  className={`w-${isMobile ? "3" : "4"} h-${
                    isMobile ? "3" : "4"
                  }`}
                />
                <span>WebAR</span>
                {cameraReady && arInitialized && (
                  <Badge className="bg-green-600 text-xs">
                    <CheckCircle className="w-2 h-2 mr-1" />
                    Live
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/80 border-gray-700">
            <CardContent className={`p-${isMobile ? "2" : "3"}`}>
              <div
                className={`text-${
                  isMobile ? "xs" : "sm"
                } text-white text-right`}
              >
                <div className="flex items-center gap-1 justify-end mb-1">
                  <Scan
                    className={`w-${isMobile ? "3" : "4"} h-${
                      isMobile ? "3" : "4"
                    }`}
                  />
                  <span>{markers.length}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {currentMarkerInfo
                    ? isMobile
                      ? "Playing"
                      : `Playing: ${currentMarkerInfo.title}`
                    : "Scanning..."}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div
          className={`absolute top-${isMobile ? "16" : "20"} left-${
            isMobile ? "2" : "4"
          } right-${isMobile ? "2" : "4"} z-20`}
        >
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className={isMobile ? "text-sm" : ""}>
              {error}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Bottom Status - Mobile Optimized */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-${
          isMobile ? "2" : "4"
        } z-20`}
      >
        {cameraReady && arInitialized && (
          <Card className="bg-black/80 border-gray-700">
            <CardContent className={`p-${isMobile ? "3" : "4"} text-center`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    currentPlayingVideo
                      ? "bg-green-500"
                      : "bg-blue-500 animate-pulse"
                  }`}
                />
                <span
                  className={`text-white font-medium text-${
                    isMobile ? "sm" : "base"
                  }`}
                >
                  {currentPlayingVideo
                    ? "AR Content Active"
                    : "Point camera at your marker"}
                </span>
              </div>
              <p className={`text-gray-400 text-${isMobile ? "xs" : "sm"}`}>
                {currentMarkerInfo
                  ? `Now playing: ${currentMarkerInfo.title}`
                  : "Align your printed marker image in the camera view"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Active Content Overlay - Mobile Optimized */}
      {currentPlayingVideo && currentMarkerInfo && (
        <div
          className={`absolute ${
            isMobile ? "top-1/3" : "top-1/2"
          } left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none px-4`}
        >
          {/* <Card className="bg-green-900/90 border-green-600">
            <CardContent className={`p-${isMobile ? "3" : "4"} text-center`}>
              <Play className={`w-${isMobile ? "6" : "8"} h-${isMobile ? "6" : "8"} mx-auto mb-2 text-green-400`} />
              <h3 className={`text-white font-semibold text-${isMobile ? "sm" : "base"}`}>Content Playing</h3>
              <p className={`text-green-200 text-${isMobile ? "xs" : "sm"}`}>{currentMarkerInfo.title}</p>
            </CardContent>
          </Card> */}
        </div>
      )}

      {/* Scanning Viewfinder - Mobile Optimized */}
      {cameraReady && arInitialized && !currentPlayingVideo && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none px-4">
          <div
            className={`${
              isMobile ? "w-64 h-40" : "w-72 h-48"
            } border-2 border-white/40 rounded-xl relative`}
          >
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-xl"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-xl"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-xl"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-xl"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`text-white text-${
                  isMobile ? "xs" : "sm"
                } bg-black/60 px-3 py-1 rounded-full text-center`}
              >
                Align marker in frame
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Markers Info Panel - Mobile Optimized */}
      {markers.length > 0 && cameraReady && arInitialized && !isMobile && (
        <div className="absolute top-20 right-4 z-20">
          <Card className="bg-black/80 border-gray-700 max-w-xs">
            <CardContent className="p-3">
              <h4 className="text-white font-semibold text-sm mb-2">
                Available Content
              </h4>
              <div className="space-y-1">
                {markers.slice(0, 4).map((marker) => (
                  <div
                    key={marker.id}
                    className="text-xs text-gray-300 flex items-center gap-2"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        currentPlayingVideo === marker.id
                          ? "bg-green-500 animate-pulse"
                          : "bg-gray-500"
                      }`}
                    />
                    <span className="truncate">{marker.title}</span>
                    {currentPlayingVideo === marker.id && (
                      <Play className="w-3 h-3 text-green-400" />
                    )}
                  </div>
                ))}
                {markers.length > 4 && (
                  <div className="text-xs text-gray-400">
                    +{markers.length - 4} more
                  </div>
                )}
              </div>
              {targetsGenerated && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="flex items-center gap-1 text-xs text-green-400">
                    <Zap className="w-3 h-3" />
                    <span>Ready for Detection</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
