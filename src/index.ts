export type SwrFunction<T> = () => Promise<T>;

export type SwrRevalidateErrorHandler = (err: unknown) => void;

export type SwrStatus = "fresh" | "stale" | "old";

type SwrWrappedFunction<T> = SwrFunction<T> & {
  readonly age: number;
  readonly status: SwrStatus;
  reset(value?: T): void;
};

export interface SwrOpts<T> {
  initialValue?: T;
  maxAge?: number;
  staleAge?: number;
  revalidateErrorHandler?: SwrRevalidateErrorHandler;
}

export default function createSWR<T>(
  fn: SwrFunction<T>,
  opts: SwrOpts<T> = {}
): SwrWrappedFunction<T> {
  const {
    maxAge = 1000,
    staleAge = 2000,
    revalidateErrorHandler,
    initialValue,
  } = opts;

  let currentValue: T;
  let lastRunTime: number;

  const setValue = (
    value?: T,
    time: number = typeof value === "undefined" ? -Infinity : Date.now()
  ) => {
    currentValue = value;
    lastRunTime = time;
  };

  const run = async () => setValue(await fn());

  const getAge = () => Date.now() - lastRunTime;

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

    return currentValue;
  };

  currentValue = initialValue;
  lastRunTime = typeof initialValue === "undefined" ? -Infinity : Date.now();

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
