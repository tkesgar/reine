export type SwrFunction<T> = () => Promise<T>;

export type SwrRevalidateErrorHandler = (err: unknown) => void;

export type SwrStatus = "fresh" | "stale" | "old";

type SwrWrappedFunction<T> = SwrFunction<T> & {
  readonly age: number;
  readonly status: SwrStatus;
  reset(value?: T): void;
};

export interface SwrStore<T> {
  getValue(): T;
  getTime(): number;
  set(value: T, time: number): void;
}

export interface SwrOpts<T> {
  initialValue?: T;
  maxAge?: number;
  staleAge?: number;
  store?: SwrStore<T>;
  revalidateErrorHandler?: SwrRevalidateErrorHandler;
}

export function createInMemoryStore<T>(): SwrStore<T> {
  let value: T;
  let time: number;

  return {
    getValue() {
      return value;
    },
    getTime() {
      return time;
    },
    set(newValue, newTime) {
      value = newValue;
      time = newTime;
    },
  };
}

export default function createSWR<T>(
  fn: SwrFunction<T>,
  opts: SwrOpts<T> = {}
): SwrWrappedFunction<T> {
  const {
    maxAge = 1000,
    staleAge = 2000,
    store = createInMemoryStore<T>(),
    revalidateErrorHandler,
    initialValue,
  } = opts;

  const setValue = (
    value?: T,
    time: number = typeof value === "undefined" ? -Infinity : Date.now()
  ) => store.set(value, time);

  const run = async () => setValue(await fn());

  const getAge = () => Date.now() - store.getTime();

  const getStatus = () => {
    const age = getAge();

    if (age < maxAge) {
      return "fresh";
    }

    if (age < staleAge) {
      return "stale";
    }

    return "old";
  };

  const wrappedFn: SwrFunction<T> = async () => {
    const status = getStatus();
    switch (status) {
      case "old":
        await run();
        break;
      case "stale":
        run().catch((err) => {
          if (revalidateErrorHandler) {
            revalidateErrorHandler(err);
          }
        });
        break;
      default:
        break;
    }

    return store.getValue();
  };

  store.set(
    initialValue,
    typeof initialValue === "undefined" ? -Infinity : Date.now()
  );

  return Object.assign(
    Object.defineProperties(wrappedFn, {
      age: {
        get: getAge,
        enumerable: true,
      },
      status: {
        get: getStatus,
        enumerable: true,
      },
    }),
    {
      reset(value?: T) {
        setValue(value);
      },
    }
  );
}
