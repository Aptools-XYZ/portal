import { Types } from "aptos"
import { Type } from "typescript"

export const makeVestingDepositPayload = (
  coinType: string,
  addresses: Types.Address[],
  amounts: Types.U64[],
  cliffs: Types.U64[],
  from: number,
  to: number,
) => {
  return {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::vesting::deposit`,
    type_arguments: [coinType],
    arguments: [addresses, amounts, cliffs, from, to],
  } as Types.TransactionPayload
}

export const makeVestingClaimPayload = (
  coinType: string,
  index: number,
) => {
  return {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::vesting::claim`,
    type_arguments: [coinType],
    arguments: [index],
  } as Types.TransactionPayload
}

export const makeVestingWithdrawalPayload = (
  coinType: string,
  index: number,
) => {
  return {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::vesting::withdraw`,
    type_arguments: [coinType],
    arguments: [index],
  } as Types.TransactionPayload
}