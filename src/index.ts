export type SwrFunction<T> = () => Promise<T>;

export type SwrRevalidateErrorHandler = (err: unknown) => void;

export type SwrStatus = "fresh" | "stale" | "old";

type SwrWrappedFunction<T> = SwrFunction<T> & {
  readonly age: number;
  readonly status: SwrStatus;
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

  let data: T = initialValue;
  let lastRunTime = initialValue ? Date.now() : -Infinity;

  const run = async () => {
    data = await fn();
    lastRunTime = Date.now();
  };

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

    return data;
  };

  return Object.defineProperties(wrappedFn, {
    age: {
      get: getAge,
      enumerable: true,
    },
    status: {
      get: getStatus,
      enumerable: true,
    },
  });
}
