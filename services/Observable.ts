export default function makeObservable<T>(target: T) {
  let listeners: any[] = []; // initial listeners can be passed an an argument aswell
  let value = target;

  function get() {
    return value;
  }

  function set(newValue: T) {
    if (value === newValue) return;
    value = newValue;
    listeners.forEach((l) => l(value));
  }

  function subscribe(listenerFunc: any) {
    listeners.push(listenerFunc);
    return () => unsubscribe(listenerFunc); // will be used inside React.useEffect
  }

  function unsubscribe(listenerFunc: any) {
    listeners = listeners.filter((l) => l !== listenerFunc);
  }

  return {
    get,
    set,
    subscribe,
  };
}