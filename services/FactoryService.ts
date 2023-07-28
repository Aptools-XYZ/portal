import { Types } from "aptos"

export const makeDepositForPayload = (version = "") => {
  return {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::factory${version ? "_" + version : ""}::deposit_fee_for`,
    type_arguments: [],
    arguments: [],
  } as Types.TransactionPayload
}

export const makeWithdrawPayload = (coinUrl: string, version = "") => {
  return {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::factory${version ? "_" + version : ""}::withdraw`,
    type_arguments: [coinUrl],
    arguments: [],
  } as Types.TransactionPayload
}

