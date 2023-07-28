import { BCS } from "aptos"

// eslint-disable-next-line react-hooks/exhaustive-deps
export function vectorToString(hexString: string) {
  if (!hexString) return ''
  return new TextDecoder('utf-8').decode(hexToUint8Array(hexString))
}

export function hexToUint8Array(hexString: string) {
  return Uint8Array.from(
    hexString.replace("0x", "").match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  )
}

export function hexToU64(hexString: string) {
  return Number(new BCS.Deserializer(hexToUint8Array(hexString)).deserializeU64())
}


export function is_valid_amount(amount: string, allow_zero = false) {
  return !isNaN(+amount) && (allow_zero ? true : +amount > 0)
}

export function is_valid_address(address: string) {
  return /^0x[0-9a-fA-F]{64}$/.test(address)
}