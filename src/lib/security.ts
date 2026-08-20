const getCryptoKey = async (secret: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  // Pad or slice secret to match 32 bytes for AES-256
  const rawKey = enc.encode(secret.padEnd(32, '0').slice(0, 32));
  return await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
};

/**
 * Encrypts cleartext using AES-GCM with a random IV.
 * Returns a Base64-encoded string combining the IV and the encrypted data.
 */
export const encryptText = async (text: string): Promise<string> => {
  if (!text) return "";
  try {
    const secret = import.meta.env.VITE_ENCRYPTION_KEY || "medinova_secure_key_123_456_789";
    const key = await getCryptoKey(secret);
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(text)
    );
    
    // Combine IV and ciphertext into one byte array
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);
    
    // Convert to Base64
    let binary = "";
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error("Encryption failed:", error);
    return text; // Fallback
  }
};

/**
 * Decrypts a Base64-encoded AES-GCM ciphertext.
 * Returns the cleartext, or the original string if decryption fails (handling unencrypted legacy data).
 */
export const decryptText = async (cipherText: string): Promise<string> => {
  if (!cipherText) return "";
  try {
    const secret = import.meta.env.VITE_ENCRYPTION_KEY || "medinova_secure_key_123_456_789";
    const key = await getCryptoKey(secret);
    
    // Decode Base64 to byte array
    const binaryString = atob(cipherText);
    const len = binaryString.length;
    const combined = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
    // Extract 12-byte IV and the encrypted payload
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    // If decryption fails, assume it is plain unencrypted text (e.g., from seed data)
    return cipherText;
  }
};

/**
 * Mask sensitive string data, leaving only the first few characters visible.
 */
export const maskText = (text: string | number | undefined, visibleCount: number = 3): string => {
  if (text === undefined || text === null) return "";
  const str = String(text);
  if (str.length <= visibleCount) return "••••";
  return str.slice(0, visibleCount) + "••••••••";
};
