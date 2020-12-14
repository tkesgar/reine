export type SwrFunction<T> = () => Promise<T>;

export type SwrRevalidateErrorHandler = (err: unknown) => void;

export type SwrStatus = "fresh" | "stale" | "old";

export interface SwrOpts<T> {
  initialValue?: T;
  maxAge?: number;
  staleAge?: number;
  revalidateErrorHandler?: SwrRevalidateErrorHandler;
}

export class SWR<T> {
  readonly fn: SwrFunction<T>;
  readonly staleAge: number;
  readonly maxAge: number;
  readonly revalidateErrorHandler: SwrRevalidateErrorHandler;

  private data: T;
  private lastRunTime = -Infinity;

  constructor(fn: SwrFunction<T>, opts: SwrOpts<T>) {
    const {
      maxAge = 1000,
      staleAge = 2000,
      revalidateErrorHandler,
      initialValue,
    } = opts;

    this.fn = fn;
    this.maxAge = maxAge;
    this.staleAge = staleAge;
    this.revalidateErrorHandler = revalidateErrorHandler;

    if (initialValue) {
      this.data = initialValue;
      this.lastRunTime = Date.now();
    }
  }

  private async run(): Promise<void> {
    this.data = await this.fn();
    this.lastRunTime = Date.now();
  }

  get age(): number {
    return Date.now() - this.lastRunTime;
  }

  get status(): SwrStatus {
    if (this.age < this.maxAge) {
      return "fresh";
    }

    if (this.age < this.staleAge) {
      return "stale";
    }

    return "old";
  }

  async get(): Promise<T> {
    switch (this.status) {
      case "old":
        await this.run();
        break;
      case "stale":
        this.run().catch((err) => {
          if (this.revalidateErrorHandler) {
            this.revalidateErrorHandler(err);
          }
        });
        break;
      default:
        break;
    }

    return this.data;
  }
}
