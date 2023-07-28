import { Types } from "aptos"

export const makeAirdropDepositPayload = (
  coinType: string,
  addresses: Types.Address[],
  amounts: Types.U64[],
  expires_at: number,
  version = ""
) => {
  return {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::airdropper${version ? "_" + version : ""}::deposit`,
    type_arguments: [coinType],
    arguments: [addresses, amounts, expires_at],
  } as Types.TransactionPayload
}

export const makeAirdropAppendPayload = (
  coinType: string,
  addresses: Types.Address[],
  amounts: Types.U64[],
  index: number,
  version = ""
) => {
  return {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::airdropper${version ? "_" + version : ""}::append`,
    type_arguments: [coinType],
    arguments: [addresses, amounts, index],
  } as Types.TransactionPayload
}

export const makeAirdropClaimPayload = (
  coinType: string,
  index: number,
  version = ""
) => {
  return {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::airdropper${version ? "_" + version : ""}::claim`,
    type_arguments: [coinType],
    arguments: [index],
  } as Types.TransactionPayload
}