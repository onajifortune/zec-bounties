/**
 * seed-auth.ts
 *
 * Client-only cryptographic identity for passwordless auth.
 *
 * Design goals (Signal-style / "maximum privacy"):
 *  - The mnemonic and derived private key NEVER leave the browser.
 *  - The server only ever sees a public key + signatures over random,
 *    single-use, short-lived nonces. It cannot reconstruct the identity
 *    from anything it stores.
 *  - The mnemonic IS the backup. There is no server-side recovery path
 *    by design — that's the privacy/convenience tradeoff, same as a
 *    crypto wallet. Make sure your UI is very explicit about this.
 *
 * Install:
 *   npm install bip39 @noble/ed25519 @noble/hashes
 */

import * as bip39 from "bip39";
import * as ed from "@noble/ed25519";
// v3 reorganized @noble/hashes exports under sha2.js. If your installed
// @noble/hashes version doesn't have this path, fall back to "@noble/hashes/sha512".
import { sha512 } from "@noble/hashes/sha2.js";

// @noble/ed25519 v3 replaced the old `ed.etc.sha512Sync` hook with a
// top-level `ed.hashes` object. Setting `ed.hashes.sha512` enables the
// synchronous API (ed.sign / ed.verify / ed.getPublicKey) — your backend's
// /key/login route calls `ed.verify(...)` synchronously, so this MUST also
// be configured server-side (see auth-routes-additions.js).
if (!ed.hashes.sha512) {
  ed.hashes.sha512 = sha512;
}

export interface KeyPair {
  /** hex-encoded 32-byte ed25519 private key. Keep in memory only. */
  privateKey: string;
  /** hex-encoded 32-byte ed25519 public key. Safe to send to the server. */
  publicKey: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

/** Generates a fresh 24-word (256-bit entropy) BIP39 mnemonic. */
export function generateMnemonic(): string {
  return bip39.generateMnemonic(256);
}

/** Validates a mnemonic's checksum/wordlist before trying to derive a key from it. */
export function isValidMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(normalizeMnemonic(mnemonic));
}

export function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().split(/\s+/).join(" ");
}

/**
 * Deterministically derives an ed25519 keypair from a mnemonic.
 *
 * Note: this takes the first 32 bytes of the BIP39 seed as the ed25519
 * private key scalar input. It's a single fixed identity per phrase
 * (no BIP32/SLIP-0010 account tree) — appropriate for "one identity per
 * phrase" auth, not a multi-account wallet. An optional passphrase
 * (BIP39 "25th word") can be supplied for an extra secret factor; if
 * used, the user must remember to supply it every time too.
 */
export async function deriveKeyPair(
  mnemonic: string,
  passphrase = "",
): Promise<KeyPair> {
  const normalized = normalizeMnemonic(mnemonic);
  if (!bip39.validateMnemonic(normalized)) {
    throw new Error("Invalid recovery phrase");
  }
  const seed = bip39.mnemonicToSeedSync(normalized, passphrase); // 64 bytes
  const privateKeyBytes = seed.slice(0, 32);
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
  return {
    privateKey: bytesToHex(privateKeyBytes),
    publicKey: bytesToHex(publicKeyBytes),
  };
}

/**
 * Signs a hex-encoded nonce (as issued by /auth/key/challenge) and
 * returns a hex-encoded signature. The nonce is hex-decoded to raw
 * bytes before signing so it matches what the backend's `ed.verify`
 * expects (it hex-decodes the `message` string internally).
 */
export async function signNonce(
  privateKeyHex: string,
  nonceHex: string,
): Promise<string> {
  // v3 no longer auto-converts hex strings to bytes — both args must be
  // Uint8Array.
  const messageBytes = hexToBytes(nonceHex);
  const privateKeyBytes = hexToBytes(privateKeyHex);
  const sigBytes = await ed.signAsync(messageBytes, privateKeyBytes);
  return bytesToHex(sigBytes);
}
