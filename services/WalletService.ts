import React from "react";
import makeObservable from "./Observable";

const connectorStore = makeObservable({ open: false });

export const useWalletConnector = () => {
  const [getOpenModal, setOpenModal] = React.useState(connectorStore.get());

  React.useEffect(() => {
    return connectorStore.subscribe(setOpenModal);
  }, []);

  const actions = React.useMemo(() => {
    return {
      setModalOpen: (open: boolean) => connectorStore.set({ open }),
    }
  }, [])

  return {
    state: getOpenModal,
    actions
  }
}