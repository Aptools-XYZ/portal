// 0x1::code::publish_package_txn

import { BCS, HexString, MaybeHexString, TxnBuilderTypes, Types } from "aptos"

export const makePublishPackagePayload = (
  packageMetaData: string,
  moduleData: string
) => {
  const codeSerializer = new BCS.Serializer();
  BCS.serializeVector([new TxnBuilderTypes.Module(new HexString(moduleData).toUint8Array())], codeSerializer);

  return {
    "arguments": [
      new HexString(packageMetaData).toUint8Array(),
      [new HexString(moduleData).toUint8Array()]
      //[codeSerializer.getBytes()],
    ],
    "function": "0x1::code::publish_package_txn",
    "type": "entry_function_payload",
    "type_arguments": []
  } as Types.TransactionPayload
}
