// app/head.tsx
export default function Head() {
  return (
    <>
      {/* Ensure full‑screen on mobile, account for safe‑area */}
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
      />
    </>
  );
  
}
