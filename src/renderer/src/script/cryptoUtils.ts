export async function generateRSAKeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: { name: "SHA-256" },
    },
    true,
    ["encrypt", "decrypt"]
  );
  return keyPair;
}

export async function encryptWithRSA(data: string, publicKey: CryptoKey): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const encrypted = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, dataBuffer);
  return new Uint8Array(encrypted);
}

export async function decryptWithRSA(encrypted: Uint8Array, privateKey: CryptoKey): Promise<string> {
  const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encrypted);
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

export async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const passwordBuffer = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey("raw", passwordBuffer, "PBKDF2", false, ["deriveKey"]);
  return await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPrivateKey(privateKey: CryptoKey, password: string): Promise<Uint8Array> {
  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);
  const key = await deriveKey(password, salt, 100000);
  const privateKeyJSON = JSON.stringify(await crypto.subtle.exportKey("jwk", privateKey));
  const privateKeyBuffer = new TextEncoder().encode(privateKeyJSON);
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, privateKeyBuffer);
  const combined = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
  combined.set(new Uint8Array(salt), 0);
  combined.set(new Uint8Array(iv), salt.byteLength);
  combined.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);
  return combined;
}

export async function decryptPrivateKey(encrypted: Uint8Array, password: string): Promise<CryptoKey> {
  const salt = encrypted.slice(0, 16);
  const iv = encrypted.slice(16, 28);
  const encryptedData = encrypted.slice(28);
  const key = await deriveKey(password, salt, 100000);
  const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encryptedData);
  const privateKeyJSON = new TextDecoder().decode(decryptedBuffer);
  const privateKey = await crypto.subtle.importKey("jwk", JSON.parse(privateKeyJSON), { name: "RSA-OAEP" }, true, ["decrypt"]);
  return privateKey;
}