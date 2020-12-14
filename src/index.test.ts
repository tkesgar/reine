import { SWR, SwrFunction, SwrOpts } from ".";

jest.useFakeTimers("modern");

const PAVOLIA_REINE = {
  name: "Pavolia Reine",
  illustrator: "Iida Pochi",
  tags: ["#Pavolia_Reine", "#Pavolive", "#Reinessance", "#POGVOLIA"],
};

const KUREIJI_OLLIE = {
  name: "Kureiji Ollie",
  illustrator: "LAM",
  tags: ["#Kureiji_Ollie", "#OLLIEginal", "#graveyART", "#OLLIcin", "#OLLInfo"],
};

const ANYA_MELFISSA = {
  name: "Anya Melfissa",
  illustrator: "Uekura Eku",
  tags: ["#Anya_Melfissa", "#Melfriends", "#anyatelier"],
};

function createTestSWR<T>(swrFn: SwrFunction<T>, opts: Partial<SwrOpts> = {}) {
  const fn = jest.fn(swrFn);
  const errorHandler = jest.fn();

  const swr = new SWR(fn, {
    maxAge: 1000,
    staleAge: 2000,
    errorHandler,
    ...opts,
  });

  return { swr, fn, errorHandler };
}

function createDefaultTestSWR() {
  return createTestSWR(async () => PAVOLIA_REINE);
}

beforeEach(() => {
  jest.setSystemTime(10000);
});

describe("SWR", () => {
  describe("age", () => {
    it("should return Infinity if data is never available before", () => {
      const { swr } = createDefaultTestSWR();
      expect(swr.age).toBe(Infinity);
    });

    it("should return correct data age", async () => {
      const { swr } = createDefaultTestSWR();
      await swr.get();

      jest.setSystemTime(15000);

      expect(swr.age).toBe(5000);
    });
  });

  describe("status", () => {
    it("should return 'fresh' if AGE = 0", async () => {
      const { swr } = createDefaultTestSWR();
      await swr.get();

      jest.setSystemTime(10000);
      expect(swr.age).toBe(0);
      expect(swr.status).toBe("fresh");
    });

    it("should return 'fresh' if 0 < AGE < maxAge", async () => {
      const { swr } = createDefaultTestSWR();
      await swr.get();

      jest.setSystemTime(10500);
      expect(swr.age).toBe(500);
      expect(swr.status).toBe("fresh");
    });

    it("should return 'stale' if AGE = maxAge", async () => {
      const { swr } = createDefaultTestSWR();
      await swr.get();

      jest.setSystemTime(11000);
      expect(swr.age).toBe(1000);
      expect(swr.status).toBe("stale");
    });

    it("should return 'stale' if maxAge < AGE < staleAge", async () => {
      const { swr } = createDefaultTestSWR();
      await swr.get();

      jest.setSystemTime(11500);
      expect(swr.age).toBe(1500);
      expect(swr.status).toBe("stale");
    });

    it("should return 'old' if AGE = staleAge", async () => {
      const { swr } = createDefaultTestSWR();
      await swr.get();

      jest.setSystemTime(12000);
      expect(swr.age).toBe(2000);
      expect(swr.status).toBe("old");
    });

    it("should return 'old' if staleAge < AGE", async () => {
      const { swr } = createDefaultTestSWR();
      await swr.get();

      jest.setSystemTime(12500);
      expect(swr.age).toBe(2500);
      expect(swr.status).toBe("old");
    });

    it("should return 'old' if AGE = Infinity", () => {
      const { swr } = createDefaultTestSWR();

      expect(swr.age).toBe(Infinity);
      expect(swr.status).toBe("old");
    });
  });

  describe("get", () => {
    it("should return the value without executing the function if status is fresh", async () => {
      const { swr, fn } = createDefaultTestSWR();

      await swr.get();
      expect(fn).toBeCalled();
      fn.mockReset();

      jest.setSystemTime(10500);

      await swr.get();
      expect(fn).not.toBeCalled();
    });

    it("should return the old value and execute function if status is stale, then on next get immediately return value without execute function", async () => {
      const { swr, fn } = createDefaultTestSWR();

      fn.mockImplementation(async () => ANYA_MELFISSA);
      const value1 = await swr.get();

      expect(fn).toBeCalledTimes(1);
      expect(value1).toEqual(ANYA_MELFISSA);

      jest.setSystemTime(11500);

      fn.mockImplementation(async () => KUREIJI_OLLIE);
      const value2 = await swr.get();
      await Promise.resolve();

      expect(fn).toBeCalledTimes(2);
      expect(value2).toEqual(ANYA_MELFISSA);

      jest.setSystemTime(12000);

      const value3 = await swr.get();

      expect(fn).toBeCalledTimes(2);
      expect(value3).toEqual(KUREIJI_OLLIE);
    });

    it("should execute function and return the value if status is old", async () => {
      const { swr, fn } = createDefaultTestSWR();

      const value1 = await swr.get();
      expect(value1).toEqual(PAVOLIA_REINE);

      jest.setSystemTime(15000);
      expect(swr.status).toBe("old");

      fn.mockImplementation(async () => ANYA_MELFISSA);
      const value2 = await swr.get();
      expect(value2).toEqual(ANYA_MELFISSA);
    });

    it("should throw error if get is called and status is old", async () => {
      const { swr, fn } = createDefaultTestSWR();

      const value1 = await swr.get();
      expect(value1).toEqual(PAVOLIA_REINE);

      jest.setSystemTime(15000);
      expect(swr.status).toBe("old");

      fn.mockImplementation(async () => {
        throw new Error("API request failed");
      });

      expect(async () => swr.get()).rejects.toThrow("API request failed");
    });

    it("should call errorHandler with error if get is called and status is stale", async () => {
      const { swr, fn, errorHandler } = createDefaultTestSWR();

      const value1 = await swr.get();
      expect(value1).toEqual(PAVOLIA_REINE);

      jest.setSystemTime(11500);
      expect(swr.status).toBe("stale");

      const err = new Error("API request failed");
      fn.mockImplementation(async () => {
        throw err;
      });

      const value2 = await swr.get();
      await Promise.resolve();

      expect(value2).toEqual(PAVOLIA_REINE);
      expect(errorHandler).toBeCalledWith(err);
    });

    it("should not call errorHandler with error nor throw error if get is called and status is fresh", async () => {
      const { swr, fn, errorHandler } = createDefaultTestSWR();

      const value1 = await swr.get();
      expect(value1).toEqual(PAVOLIA_REINE);

      jest.setSystemTime(10500);
      expect(swr.status).toBe("fresh");

      const err = new Error("API request failed");
      fn.mockImplementation(async () => {
        throw err;
      });

      const value2 = await swr.get();
      await Promise.resolve();

      expect(value2).toEqual(PAVOLIA_REINE);
      expect(errorHandler).not.toBeCalled();
    });
  });
});
