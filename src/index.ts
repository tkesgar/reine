export type SwrFunction<T> = () => Promise<T>;

export type SwrErrorHandler = (err: unknown) => void;

export type SwrStatus = "fresh" | "stale" | "old";

export interface SwrOpts {
  maxAge: number;
  staleAge: number;
  errorHandler: SwrErrorHandler;
}

export class SWR<T> {
  readonly fn: SwrFunction<T>;
  readonly staleAge: number;
  readonly maxAge: number;
  readonly errorHandler: SwrErrorHandler;

  private data: T;
  private lastRunTime = -Infinity;

  constructor(fn: SwrFunction<T>, opts: SwrOpts) {
    const { maxAge, staleAge, errorHandler } = opts;

    this.fn = fn;
    this.maxAge = maxAge;
    this.staleAge = staleAge;
    this.errorHandler = errorHandler;
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
        this.run().catch(this.errorHandler);
        break;
      default:
        break;
    }

    return this.data;
  }
}
