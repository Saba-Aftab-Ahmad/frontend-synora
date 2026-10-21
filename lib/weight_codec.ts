/**
 * lib/weight_codec.ts
 * Weight Serialisation Module (client side, SDS 10.4):
 * tensors travel as base64(float32 little-endian) instead of nested JSON
 * number lists  ->  0.64 MB of weights = 0.86 MB on the wire (was 3.4 MB).
 */

export function f32ToB64(arr: Float32Array): string {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(bin);
}

export function b64ToF32(b64: string): Float32Array {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(buf);
}

export function b64ToU16(b64: string): Uint16Array {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Uint16Array(buf);
}

export type WireTensor = {
  layer_name: string;
  shape: number[];
  dtype: "float32";
  data_b64: string;
};
