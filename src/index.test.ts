import createSWR, { SwrFunction, SwrOpts } from ".";

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

function createTestSWR<T>(swrFn: SwrFunction<T>, opts: SwrOpts<T> = {}) {
  const fn = jest.fn(swrFn);
  const swr = createSWR(fn, opts);

  return { swr, fn };
}

function createExampleTestSWR(opts: SwrOpts<typeof PAVOLIA_REINE> = {}) {
  return createTestSWR(async () => PAVOLIA_REINE, opts);
}

beforeEach(() => {
  jest.setSystemTime(10000);
});

describe("SWR", () => {
  describe("age", () => {
    it("should return Infinity if data is never available before", () => {
      const { swr } = createExampleTestSWR();
      expect(swr.age).toBe(Infinity);
    });

    it("should return correct data age", async () => {
      const { swr } = createExampleTestSWR();
      await swr();

      jest.setSystemTime(15000);

      expect(swr.age).toBe(5000);
    });
  });

  describe("status", () => {
    it("should return 'fresh' if AGE = 0", async () => {
      const { swr } = createExampleTestSWR();
      await swr();

      jest.setSystemTime(10000);
      expect(swr.age).toBe(0);
      expect(swr.status).toBe("fresh");
    });

    it("should return 'fresh' if 0 < AGE < maxAge", async () => {
      const { swr } = createExampleTestSWR();
      await swr();

      jest.setSystemTime(10500);
      expect(swr.age).toBe(500);
      expect(swr.status).toBe("fresh");
    });

    it("should return 'stale' if AGE = maxAge", async () => {
      const { swr } = createExampleTestSWR();
      await swr();

      jest.setSystemTime(11000);
      expect(swr.age).toBe(1000);
      expect(swr.status).toBe("stale");
    });

    it("should return 'stale' if maxAge < AGE < staleAge", async () => {
      const { swr } = createExampleTestSWR();
      await swr();

      jest.setSystemTime(11500);
      expect(swr.age).toBe(1500);
      expect(swr.status).toBe("stale");
    });

    it("should return 'old' if AGE = staleAge", async () => {
      const { swr } = createExampleTestSWR();
      await swr();

      jest.setSystemTime(12000);
      expect(swr.age).toBe(2000);
      expect(swr.status).toBe("old");
    });

    it("should return 'old' if staleAge < AGE", async () => {
      const { swr } = createExampleTestSWR();
      await swr();

      jest.setSystemTime(12500);
      expect(swr.age).toBe(2500);
      expect(swr.status).toBe("old");
    });

    it("should return 'old' if AGE = Infinity", () => {
      const { swr } = createExampleTestSWR();

      expect(swr.age).toBe(Infinity);
      expect(swr.status).toBe("old");
    });
  });

  describe("get", () => {
    it("should return the value without executing the function if status is fresh", async () => {
      const { swr, fn } = createExampleTestSWR();

      await swr();
      expect(fn).toBeCalled();
      fn.mockReset();

      jest.setSystemTime(10500);

      await swr();
      expect(fn).not.toBeCalled();
    });

    it("should return the old value and execute function if status is stale, then on next get immediately return value without execute function", async () => {
      const { swr, fn } = createExampleTestSWR();

      fn.mockImplementation(async () => ANYA_MELFISSA);
      const value1 = await swr();

      expect(fn).toBeCalledTimes(1);
      expect(value1).toEqual(ANYA_MELFISSA);

      jest.setSystemTime(11500);

      fn.mockImplementation(async () => KUREIJI_OLLIE);
      const value2 = await swr();
      await Promise.resolve();

      expect(fn).toBeCalledTimes(2);
      expect(value2).toEqual(ANYA_MELFISSA);

      jest.setSystemTime(12000);

      const value3 = await swr();

      expect(fn).toBeCalledTimes(2);
      expect(value3).toEqual(KUREIJI_OLLIE);
    });

    it("should execute function and return the value if status is old", async () => {
      const { swr, fn } = createExampleTestSWR();

      const value1 = await swr();
      expect(value1).toEqual(PAVOLIA_REINE);

      jest.setSystemTime(15000);
      expect(swr.status).toBe("old");

      fn.mockImplementation(async () => ANYA_MELFISSA);
      const value2 = await swr();
      expect(value2).toEqual(ANYA_MELFISSA);
    });

    it("should throw error if get is called and status is old", async () => {
      const { swr, fn } = createExampleTestSWR();

      const value1 = await swr();
      expect(value1).toEqual(PAVOLIA_REINE);

      jest.setSystemTime(15000);
      expect(swr.status).toBe("old");

      fn.mockImplementation(async () => {
        throw new Error("API request failed");
      });

      expect(async () => swr()).rejects.toThrow("API request failed");
    });

    it("should silently ignore error if revalidateErrorHandler is not provided", async () => {
      const { swr, fn } = createExampleTestSWR();

      const value1 = await swr();
      expect(value1).toEqual(PAVOLIA_REINE);

      jest.setSystemTime(11500);
      expect(swr.status).toBe("stale");

      fn.mockImplementation(async () => {
        throw new Error("API request failed");
      });

      const value2 = await swr();
      await Promise.resolve();

      expect(value2).toEqual(PAVOLIA_REINE);
    });

    it("should call revalidateErrorHandler with error if get is called and status is stale", async () => {
      const revalidateErrorHandler = jest.fn();
      const { swr, fn } = createExampleTestSWR({ revalidateErrorHandler });

      const value1 = await swr();
      expect(value1).toEqual(PAVOLIA_REINE);

      jest.setSystemTime(11500);
      expect(swr.status).toBe("stale");

      const err = new Error("API request failed");
      fn.mockImplementation(async () => {
        throw err;
      });

      const value2 = await swr();
      await Promise.resolve();

      expect(value2).toEqual(PAVOLIA_REINE);
      expect(revalidateErrorHandler).toBeCalledWith(err);
    });

    it("should not call revalidateErrorHandler with error nor throw error if get is called and status is fresh", async () => {
      const revalidateErrorHandler = jest.fn();
      const { swr, fn } = createExampleTestSWR({ revalidateErrorHandler });

      const value1 = await swr();
      expect(value1).toEqual(PAVOLIA_REINE);

      jest.setSystemTime(10500);
      expect(swr.status).toBe("fresh");

      const err = new Error("API request failed");
      fn.mockImplementation(async () => {
        throw err;
      });

      const value2 = await swr();
      await Promise.resolve();

      expect(value2).toEqual(PAVOLIA_REINE);
      expect(revalidateErrorHandler).not.toBeCalled();
    });
  });

  describe("initialValue", () => {
    it("should have status = fresh if initial value is provided", async () => {
      const { swr } = createExampleTestSWR({ initialValue: PAVOLIA_REINE });

      jest.setSystemTime(10500);
      expect(swr.status).toBe("fresh");
    });

    it("should have status = old if initial value is not provided", async () => {
      const { swr } = createExampleTestSWR();

      jest.setSystemTime(10500);
      expect(swr.status).toBe("old");
    });
  });

  describe("without opts", () => {
    it("should work with default opts (maxAge = 1000, staleAge = 2000)", async () => {
      const fn = jest.fn(async () => PAVOLIA_REINE);

      const swr = createSWR(fn);
      expect(swr.age).toBe(Infinity);
      expect(swr.status).toBe("old");

      jest.setSystemTime(10500);
      await swr();
      expect(fn).toBeCalled();

      jest.setSystemTime(11000);
      await swr();
      expect(fn).toBeCalledTimes(1);

      jest.setSystemTime(12500);
      await swr();
      await Promise.resolve();
      expect(fn).toBeCalledTimes(2);

      jest.setSystemTime(15000);
      await swr();
      expect(fn).toBeCalledTimes(3);
    });

    it("should not report error if called after 1500 ms", async () => {
      const fn = jest.fn(async () => PAVOLIA_REINE);

      const swr = createSWR(fn);

      jest.setSystemTime(11000);
      const value1 = await swr();

      expect(fn).toBeCalled();
      expect(value1).toEqual(PAVOLIA_REINE);

      jest.setSystemTime(12500);
      const value2 = await swr();
      await Promise.resolve();

      expect(fn).toBeCalledTimes(2);
      expect(value2).toEqual(PAVOLIA_REINE);
    });
  });

  describe("reset", () => {
    it("should clear the current value and make the function to be called again", async () => {
      const { swr, fn } = createExampleTestSWR();

      await swr();

      jest.setSystemTime(10500);
      expect(swr.status).toBe("fresh");

      swr.reset();
      expect(swr.status).toBe("old");

      await swr();
      expect(fn).toBeCalledTimes(2);
    });

    it("should refreshes with the new value if a value is provided", async () => {
      const { swr, fn } = createExampleTestSWR();

      const value1 = await swr();
      expect(value1).toBe(PAVOLIA_REINE);

      jest.setSystemTime(10500);
      expect(swr.status).toBe("fresh");

      swr.reset(ANYA_MELFISSA);
      expect(swr.status).toBe("fresh");

      jest.setSystemTime(11000);
      const value2 = await swr();
      expect(value2).toBe(ANYA_MELFISSA);
    });
  });
});
