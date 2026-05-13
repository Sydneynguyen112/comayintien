// AES-256-GCM encrypt cho MT5 investor password.
// Format compatible với Python's mt5-bridge/app/crypto.py:
//   ciphertext = base64( [12-byte nonce] [ciphertext + 16-byte tag] )
//
// Dùng Web Crypto API → chạy được trên cả Node và Edge runtime.
// Key đọc từ env var ENCRYPTION_KEY (64 hex chars = 32 bytes).
// Sinh key: `python -c "import secrets; print(secrets.token_hex(32))"`

const NONCE_SIZE = 12;
const KEY_SIZE = 32;

// Return type ràng buộc <ArrayBuffer> (không phải ArrayBufferLike) để pass strict
// BufferSource check của TS 5.7+ — Web Crypto APIs yêu cầu ArrayBufferView<ArrayBuffer>.
function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length !== KEY_SIZE * 2) {
    throw new Error(`ENCRYPTION_KEY phải là ${KEY_SIZE * 2} hex chars, nhận được ${hex.length}`);
  }
  // Explicit `new ArrayBuffer(...)` đảm bảo TS infer Uint8Array<ArrayBuffer>, không phải <ArrayBufferLike>.
  const out = new Uint8Array(new ArrayBuffer(KEY_SIZE));
  for (let i = 0; i < KEY_SIZE; i++) {
    const byte = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error(`ENCRYPTION_KEY chứa ký tự không phải hex`);
    out[i] = byte;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  // Tránh Buffer để chạy được trên Edge runtime
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function getCryptoKey(): Promise<CryptoKey> {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error("ENCRYPTION_KEY chưa được set trong env");
  return crypto.subtle.importKey("raw", hexToBytes(hex), { name: "AES-GCM" }, false, ["encrypt"]);
}

/**
 * Mã hoá plaintext (vd MT5 investor password) → base64 string.
 * Mỗi lần gọi sinh nonce ngẫu nhiên → ciphertext khác nhau dù plaintext giống.
 */
export async function encryptMt5Password(plaintext: string): Promise<string> {
  const key = await getCryptoKey();
  // Explicit ArrayBuffer cho cả nonce, plaintext, combined — tránh ArrayBufferLike widening.
  const nonce = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(NONCE_SIZE)));
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    plaintextBytes,
  );
  const ciphertext = new Uint8Array(ciphertextBuf);
  const combined = new Uint8Array(new ArrayBuffer(NONCE_SIZE + ciphertext.length));
  combined.set(nonce, 0);
  combined.set(ciphertext, NONCE_SIZE);
  return bytesToBase64(combined);
}
