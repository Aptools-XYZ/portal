import { Types } from "aptos"

export const makeWithdrawPayload = (coinType: string, amount: Types.U64) => {
  return {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::dao_storage::withdraw`,
    type_arguments: [coinType],
    arguments: [amount],
  } as Types.TransactionPayload
}

export const makeUpdateConfigPayload = (contract: string, key: string, newValWithoutDecimals: Types.U64) => {
  const payload = {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::${contract}::set_${key.toLowerCase()}`,
    type_arguments: [],
    arguments: [contract === 'factory_v2' ? +newValWithoutDecimals / 1e8 : newValWithoutDecimals],
  } as Types.TransactionPayload

  return payload
}

export const registerCoinPayload = (coinType: string) => {
  return {
    type: 'entry_function_payload',
    function: `0x1::managed_coin::register`,
    type_arguments: [coinType],
    arguments: [],
  } as Types.TransactionPayload
}
