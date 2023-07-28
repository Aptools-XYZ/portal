import { FC, JSX, PropsWithChildren, useEffect, useState } from "react";

export function withDynamicHook(
  hookName: string,
  importFunc: () => Promise<any>,
  Component: FC<any>,
  hookNameAs?: string
): FC<any> {
  // eslint-disable-next-line react/display-name
  return (props: PropsWithChildren) => {
    const [hook, setHook] = useState();

    useEffect(() => {
      importFunc().then((mod) => {
        setHook(() => mod[hookName]);
      });
    }, []);

    if (!hook) {
      return null;
    }

    const newProps = { ...props, [hookNameAs || hookName]: hook };
    return <Component {...newProps} />;
  };
}
