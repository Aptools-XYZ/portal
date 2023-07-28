import { Types } from "aptos"
import { Address, U64 } from "aptos/src/generated"

export const makeLockupPayload = (coinType: string, amount: U64, unlock_time: number) => {
  return {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::locker::lock`,
    type_arguments: [coinType],
    arguments: [amount, unlock_time],
  } as Types.TransactionPayload
}

export const makeTransferPayload = (coinType: string, new_owner: Address, index: U64) => {
  return {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::locker::transfer_ownership`,
    type_arguments: [coinType],
    arguments: [new_owner, index],
  } as Types.TransactionPayload
}

export const makeWithdrawPayload = (coinType: string, index: U64) => {
  return {
    type: 'entry_function_payload',
    function: `${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}::locker::transfer_ownership`,
    type_arguments: [coinType],
    arguments: [index],
  } as Types.TransactionPayload
}

