export type SwrFunction<T> = () => Promise<T>;

export type SwrErrorHandler = (err: unknown) => void;

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
  private lastRunTime = Infinity;

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
    return Math.max(0, Date.now() - this.lastRunTime);
  }

  get stale(): boolean {
    return this.age > this.maxAge;
  }

  get old(): boolean {
    return this.age > this.staleAge;
  }

  async get(): Promise<T> {
    if (this.old) {
      await this.run();
    } else if (this.stale) {
      this.run().catch(this.errorHandler);
    }

    return this.data;
  }
}
