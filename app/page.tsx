import ProductionARViewer from "@/components/production-ar-viewer"

export default function HomePage() {
  return <ProductionARViewer />
}

export const metadata = {
  title: "My Page",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};