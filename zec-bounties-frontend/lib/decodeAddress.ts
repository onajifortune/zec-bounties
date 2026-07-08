// lib/decodeAddress.ts
import { ZaddrModuleAny } from "./types";

let wasmModule: any = null;
let wasmInitialized = false;

export function isDecoderReady() {
  return wasmInitialized;
}

export async function initAddressDecoder() {
  if (wasmInitialized) return;

  try {
    const mod: ZaddrModuleAny =
      await import("@elemental-zcash/zaddr_wasm_parser");
    if (typeof mod.initWasm === "function") {
      await mod.initWasm();
    }
    wasmModule = mod;
    wasmInitialized = true;
    console.log("[decodeAddress] WASM decoder ready");
  } catch (err) {
    console.error("Failed to load Zcash address decoder WASM:", err);
  }
}

export function getAddressReceivers(address: string) {
  if (!wasmModule || !address) {
    return {
      orchard: false,
      sapling: false,
      transparent: false,
      type: "Unknown",
    };
  }

  try {
    const receiversFn =
      wasmModule.getAddressReceivers ?? wasmModule.get_address_receivers;
    if (!receiversFn) {
      return {
        orchard: false,
        sapling: false,
        transparent: false,
        type: "Unknown",
      };
    }

    const result = receiversFn(address);

    const hasOrchard = !!result.orchard;
    const hasSapling = !!result.sapling;
    const hasTransparent = !!result.p2pkh || !!result.p2sh || !!result.tex;

    let type = "None";
    if (hasOrchard && hasSapling && hasTransparent) type = "Full";
    else if (hasOrchard && hasSapling) type = "Orchard + Sapling";
    else if (hasOrchard) type = "Orchard";
    else if (hasSapling) type = "Sapling";
    else if (hasTransparent) type = "Transparent";

    return {
      orchard: hasOrchard,
      sapling: hasSapling,
      transparent: hasTransparent,
      type,
    };
  } catch (err) {
    console.error("Failed to decode address:", err);
    return {
      orchard: false,
      sapling: false,
      transparent: false,
      type: "Error",
    };
  }
}
