import ProductionARViewer from "@/components/production-ar-viewer"
export default function HomePage() {
  return <ProductionARViewer />
}

export const metadata = {
  title: "WebAR Experience",
  description: "Scan markers to experience augmented reality content",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
}
