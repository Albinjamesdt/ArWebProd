// components\production-ar-viewer.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Scan,
  AlertCircle,
  CheckCircle,
  Loader,
  Upload,
} from "lucide-react";
import type { MarkerWithUrls } from "@/lib/cloudflare-client";

declare global {
  interface Window {
    AFRAME: any;
    MINDAR: any;
  }
}
 export const runtime="edge"

export default function ProductionARViewer() {
  const [markers, setMarkers] = useState<MarkerWithUrls[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [arInitialized, setArInitialized] = useState(false);
  const [activeMarkers, setActiveMarkers] = useState<Set<string>>(new Set());
  const [currentMarkerInfo, setCurrentMarkerInfo] = useState<MarkerWithUrls[]>(
    []
  );
  const [targetsGenerated, setTargetsGenerated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [target, setTarget] = useState<string>("");

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
        setMarkers(
          data.map((marker) => ({
            ...marker,
          }))
        );
        setError(null);
        console.log(`Loaded ${data.length} production markers`);
        // await generateTargetsFile();
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

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280, max: 1920, min: 640 },
          height: { ideal: 720, max: 1080, min: 480 },
        },
        audio: true,
      };

      console.log("Starting camera with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.setAttribute("webkit-playsinline", "true");
        videoRef.current.setAttribute("playsinline", "true");
        // Fix: Always mute and autoplay for mobile to allow camera preview

        if (isMobile) {
          videoRef.current.style.position = "fixed";
          videoRef.current.style.top = "0";
          videoRef.current.style.left = "0";
          videoRef.current.style.width = "100vw";
          videoRef.current.style.height = "100vh";
          videoRef.current.style.objectFit = "cover";
          videoRef.current.style.objectPosition = "center center";
          videoRef.current.style.transform = "none";
          videoRef.current.style.zIndex = arInitialized ? "0" : "1";
        }

        videoRef.current.onloadedmetadata = () => {
          console.log("Camera video loaded, playing...");
          if (videoRef.current) {
            videoRef.current.play();
            setCameraReady(true);
            setError(null);
          }
        };

        streamRef.current = stream;
        console.log("Camera stream set successfully");
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
    if (!cameraReady || markers.length === 0) {
      return;
    }

    try {
      console.log("Initializing multi-marker AR system...");
      await loadARScripts();

      if (arContainerRef.current) {
        arContainerRef.current.innerHTML = "";

        const scene = document.createElement("a-scene");

        //
        const mindARSettings = isMobile
          ? `imageTargetSrc: ${target}; autoStart: false; uiLoading: no; uiError: no; uiScanning: no; maxTrack: ${markers.length}; warmupTolerance: 2; missTolerance: 2;`
          : `imageTargetSrc: ${target}; autoStart: false; uiLoading: no; uiError: no; uiScanning: no; maxTrack: ${markers.length};`;

        scene.setAttribute("mindar-image", mindARSettings);
        scene.setAttribute("embedded", "true");
        scene.setAttribute(
          "renderer",
          "colorManagement: true, physicallyCorrectLights: true"
        );

        if (isMobile) {
          scene.setAttribute("vr-mode-ui", "enabled: false");
          scene.setAttribute(
            "device-orientation-permission-ui",
            "enabled: false"
          );
        }

        scene.style.position = "fixed";
        scene.style.top = "0";
        scene.style.left = "0";
        scene.style.width = "100vw";
        scene.style.height = "100vh";
        scene.style.zIndex = "2";

        const camera = document.createElement("a-camera");
        camera.setAttribute("position", "0 0 0");

        if (isMobile) {
          camera.setAttribute("look-controls", "enabled: false");
          camera.setAttribute("wasd-controls", "enabled: false");
          camera.setAttribute("cursor", "rayOrigin: mouse");
        }

        scene.appendChild(camera);

        // Create assets for ALL markers
        const assets = document.createElement("a-assets");

        markers.forEach((marker, index) => {
          const video = document.createElement("video");
          video.id = `productionVideo_${index}`;
          video.src = marker.videoUrl;
          video.setAttribute("preload", "auto");
          video.setAttribute("loop", "true");
          video.setAttribute("crossorigin", "anonymous");
          video.setAttribute("playsinline", "true");

          if (isMobile) {
            video.setAttribute("webkit-playsinline", "true");
            video.setAttribute("autoplay", "false");
            video.muted = true;
          }

          video.onloadeddata = () => {
            console.log(`Video loaded for marker ${index}: ${marker.title}`);
          };

          video.onerror = (e) => {
            console.error(
              `Video failed to load for marker ${index}: ${marker.title}`,
              e
            );
          };

          assets.appendChild(video);
        });

        scene.appendChild(assets);

        // Create target anchors for ALL markers
        markers.forEach((marker, index) => {
          const anchor = document.createElement("a-entity");
          anchor.setAttribute("mindar-image-target", `targetIndex: ${index}`);

          const plane = document.createElement("a-plane");
          plane.setAttribute("src", `#productionVideo_${index}`);

          // Consistent positioning for all markers
          plane.setAttribute("position", "0 0 0");
          plane.setAttribute("height", "0.552");
          plane.setAttribute("width", "1");
          plane.setAttribute("rotation", "0 0 0");
          plane.setAttribute("scale", "1 1 1");
          plane.setAttribute(
            "material",
            "transparent: true; alphaTest: 0.1; shader: flat;"
          );
          plane.setAttribute("geometry", "primitive: plane");

          if (isMobile) {
            plane.setAttribute(
              "material",
              "transparent: true; alphaTest: 0.1; shader: flat; side: double;"
            );
          }

          anchor.appendChild(plane);

          // Add event listeners for each marker
          anchor.addEventListener("targetFound", () => {
            console.log(
              `Multi-marker detected: ${marker.title} (index: ${index})`
            );

            // Add to active markers
            setActiveMarkers((prev) => {
              const newSet = new Set(prev);
              newSet.add(marker.id);
              return newSet;
            });

            // Update current marker info
            setCurrentMarkerInfo((prev) => {
              const existing = prev.find((m) => m.id === marker.id);
              if (!existing) {
                return [...prev, marker];
              }
              return prev;
            });

            // Play this marker's video
            const videoElement = document.getElementById(
              `productionVideo_${index}`
            ) as HTMLVideoElement;
            if (videoElement) {
              if (isMobile) {
                videoElement.muted = false;
                videoElement.currentTime = 0;
                videoElement.play().catch((error) => {
                  console.log("Mobile video play failed:", error);
                  setTimeout(() => {
                    videoElement.play().catch(console.error);
                  }, 100);
                });
              } else {
                videoElement.play().catch(console.error);
              }
            }

            showDetectionFeedback(`Detected: ${marker.title}`);
            logAnalytics(marker.id);
          });

          anchor.addEventListener("targetLost", () => {
            console.log(`Multi-marker lost: ${marker.title} (index: ${index})`);

            // Remove from active markers
            setActiveMarkers((prev) => {
              const newSet = new Set(prev);
              newSet.delete(marker.id);
              return newSet;
            });

            // Update current marker info
            setCurrentMarkerInfo((prev) =>
              prev.filter((m) => m.id !== marker.id)
            );

            // Pause this marker's video
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
          console.log(
            `Multi-marker AR Scene loaded with ${markers.length} markers`
          );
          setArInitialized(true);
          setError(null);

          setTimeout(
            () => {
              try {
                const aframeScene = scene;
                if (
                  aframeScene &&
                  aframeScene.systems &&
                  aframeScene.systems["mindar-image-system"]
                ) {
                  aframeScene.systems["mindar-image-system"].start();
                  console.log("Multi-marker AR system started");
                }
              } catch (startError) {
                console.error("Error starting multi-marker AR:", startError);
                setError("Failed to start AR system");
              }
            },
            isMobile ? 3000 : 1500
          );
        });

        arContainerRef.current.appendChild(scene);
      }
    } catch (err) {
      console.error("Multi-marker AR initialization error:", err);
      setError("AR initialization failed");
    }
  };

  const showDetectionFeedback = (message: string) => {
    const feedback = document.createElement("div");
    feedback.style.position = "fixed";
    feedback.style.top = isMobile ? "15%" : "15%";
    feedback.style.left = "50%";
    feedback.style.transform = "translateX(-50%)";
    feedback.style.background = "rgba(34, 197, 94, 0.95)";
    feedback.style.color = "white";
    feedback.style.padding = isMobile ? "8px 16px" : "12px 20px";
    feedback.style.borderRadius = "8px";
    feedback.style.zIndex = "1000";
    feedback.style.fontSize = isMobile ? "12px" : "14px";
    feedback.style.fontWeight = "600";
    feedback.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
    feedback.style.maxWidth = isMobile ? "90%" : "auto";
    feedback.style.textAlign = "center";
    feedback.textContent = message;

    document.body.appendChild(feedback);

    setTimeout(() => {
      if (document.body.contains(feedback)) {
        document.body.removeChild(feedback);
      }
    }, 2000);
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

  const getTargetFiles = async () => {
    try {
      const response = await fetch("/api/generate-targets-file", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch target files");
      }
      const data = await response.json();
      setTarget(data.publicUrl || "");
      loadMarkers();
      console.log("Fetched target files:", data);
    } catch (err) {
      console.error("Error fetching target files:", err);
    } finally {
      loadMarkers();
    }
  };

  useEffect(() => {
    getTargetFiles();
  }, []);

  useEffect(() => {
    if (markers.length > 0) {
      startCamera();
    }
  }, [markers, isMobile]);

  useEffect(() => {
    if (cameraReady && markers.length > 0) {
      initializeAR();
    }
  }, [cameraReady, markers, isMobile]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 z-50">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700 mx-4">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader className="w-8 h-8 animate-spin mb-4 text-blue-400" />
            <h3 className="text-white font-semibold mb-2">
              Loading Multi-Marker WebAR
            </h3>
            <p className="text-center text-gray-400">
              Preparing multiple AR targets...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (markers.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 z-50 p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Upload className="w-16 h-16 mb-6 text-gray-400" />
            <h3 className="text-white font-semibold mb-3 text-xl text-center">
              No Content Available
            </h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      {/* Camera Preview */}
      <video
        ref={videoRef}
        playsInline
        muted
        webkit-playsinline="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          objectPosition: "center center",
          zIndex: arInitialized ? 0 : 1,
          display: cameraReady ? "block" : "none",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
      />

      {/* AR Container */}
      <div
        ref={arContainerRef}
        className="fixed inset-0 w-full h-full"
        style={{
          zIndex: 2,
          width: "100vw",
          height: "100vh",
        }}
      />

      {/* Loading States */}
      {!cameraReady && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-10 p-4">
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-10 p-4">
          <Card className="bg-black/70 border-gray-700 w-full max-w-sm">
            <CardContent className="p-6 text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
              <h3 className="text-white font-semibold mb-2">
                Initializing Multi-Marker AR
              </h3>
              <p className="text-gray-400 text-sm">
                {targetsGenerated
                  ? `Loading ${markers.length} markers...`
                  : "Generating AR targets..."}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* UI Overlay */}
      <div
        className={`fixed top-0 left-0 right-0 p-${isMobile ? "2" : "4"} z-20`}
      >
        <div
          className={`flex justify-between items-start gap-${isMobile ? "2" : "4"
            }`}
        >
          <Card className="bg-transparent border-none flex-1">
            <CardContent className={`p-${isMobile ? "2" : "3"}`}>
              <div
                className={`flex items-center gap-2 text-${isMobile ? "xs" : "sm"
                  } text-white`}
              >
                <Camera
                  className={`w-${isMobile ? "3" : "4"} h-${isMobile ? "3" : "4"
                    }`}
                />
                {/* <span>Multi-Marker WebAR</span> */}
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
                className={`text-${isMobile ? "xs" : "sm"
                  } text-white text-right`}
              >
                <div className="flex items-center gap-1 justify-end mb-1">
                  <Scan
                    className={`w-${isMobile ? "3" : "4"} h-${isMobile ? "3" : "4"
                      }`}
                  />
                  <span>{markers.length}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {activeMarkers.size > 0
                    ? `Active: ${activeMarkers.size}`
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
          className={`fixed top-${isMobile ? "16" : "20"} left-${isMobile ? "2" : "4"
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

      {/* Active Markers Display */}
      {currentMarkerInfo.length > 0 && (
        <div
          className={`fixed ${isMobile ? "top-1/4" : "top-1/3"
            } left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none px-4`}
        >
          {/* <Card className="bg-green-900/90 border-green-600">
            <CardContent className={`p-${isMobile ? "3" : "4"} text-center`}>
              <Play
                className={`w-${isMobile ? "6" : "8"} h-${
                  isMobile ? "6" : "8"
                } mx-auto mb-2 text-green-400`}
              />
              <h3
                className={`text-white font-semibold text-${
                  isMobile ? "sm" : "base"
                } mb-2`}
              >
                {currentMarkerInfo.length === 1
                  ? "Content Playing"
                  : `${currentMarkerInfo.length} Contents Active`}
              </h3>
              <div className="space-y-1">
                {currentMarkerInfo.slice(0, 3).map((marker) => (
                  <p
                    key={marker.id}
                    className={`text-green-200 text-${isMobile ? "xs" : "sm"}`}
                  >
                    {marker.title}
                  </p>
                ))}
                {currentMarkerInfo.length > 3 && (
                  <p
                    className={`text-green-300 text-${isMobile ? "xs" : "sm"}`}
                  >
                    +{currentMarkerInfo.length - 3} more active
                  </p>
                )}
              </div>
            </CardContent>
          </Card> */}
        </div>
      )}

      {/* Bottom Status */}
      <div
        className={`fixed bottom-0 left-0 right-0 p-${isMobile ? "2" : "4"
          } z-20`}
      >
        {cameraReady && arInitialized && (
          <Card className="bg-transparent border-none">
            <CardContent className={`p-${isMobile ? "3" : "4"} text-center`}>
              <div className="flex items-center justify-center gap-2 mb-2 ">
                <div
                  className={`w-3 h-3 rounded-full ${activeMarkers.size > 0
                      ? "bg-green-500"
                      : "bg-blue-500 animate-pulse"
                    }`}
                />
                <span
                  className={`text-white font-medium text-${isMobile ? "sm" : "base"
                    }`}
                >
                  {activeMarkers.size > 0
                    ? `${activeMarkers.size} Marker${activeMarkers.size > 1 ? "s" : ""
                    } Active`
                    : "Scan any marker to begin"}
                </span>
              </div>
              {/* <p className={`text-gray-400 text-${isMobile ? "xs" : "sm"}`}>
                {activeMarkers.size > 0
                  ? "Multiple markers can be detected simultaneously"
                  : `${markers.length} markers available for detection`}
              </p> */}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scanning Viewfinder */}
      {cameraReady && arInitialized && activeMarkers.size === 0 && (
        <div className="fixed inset-0 flex items-center justify-center z-10 pointer-events-none px-4">
          <div
            className={`${isMobile ? "w-64 h-40" : "w-72 h-48"
              } border-2 border-white/40 rounded-xl relative`}
          >
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-xl"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-xl"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-xl"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-xl"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`text-white text-${isMobile ? "xs" : "sm"
                  } bg-black/60 px-3 py-1 rounded-full text-center`}
              >
                Scan any of {markers.length} markers
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Markers Info Panel - Desktop Only */}
      {/* {markers.length > 1 && cameraReady && arInitialized && !isMobile && (
        <div className="fixed top-20 right-4 z-20">
          <Card className="bg-black/80 border-gray-700 max-w-xs">
            <CardContent className="p-3">
              <h4 className="text-white font-semibold text-sm mb-2">
                Available Markers ({markers.length})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {markers.map((marker, index) => (
                  <div
                    key={marker.id}
                    className="text-xs text-gray-300 flex items-center gap-2"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activeMarkers.has(marker.id)
                          ? "bg-green-500 animate-pulse"
                          : "bg-gray-500"
                      }`}
                    />
                    <span className="truncate">{marker.title}</span>
                    <span className="text-gray-500">#{index}</span>
                    {activeMarkers.has(marker.id) && (
                      <Play className="w-3 h-3 text-green-400" />
                    )}
                  </div>
                ))}
              </div>
              {targetsGenerated && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="flex items-center gap-1 text-xs text-green-400">
                    <Zap className="w-3 h-3" />
                    <span>Multi-Marker Ready</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )} */}
    </div>
  );
}
