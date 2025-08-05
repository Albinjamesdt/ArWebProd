// lib/auth-utils.ts
// Universal crypto access for Cloudflare/Edge
export async function hashPassword(
  password: string,
  salt: string,
  iterations: number
): Promise<string> {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function comparePasswords(
  password: string,
  storedHash: string,
  salt: string,
  iterations: number
): Promise<boolean> {
  try {
    const computedHash = await hashPassword(password, salt, iterations);
    
    // Constant-time comparison
    if (storedHash.length !== computedHash.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < storedHash.length; i++) {
      result |= storedHash.charCodeAt(i) ^ computedHash.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}