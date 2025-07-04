import ProductionARViewer from "@/components/production-ar-viewer"

export default function HomePage() {
  return <ProductionARViewer />
}

export const metadata = {
  title: "WEBAR",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};