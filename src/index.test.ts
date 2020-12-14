describe("SWR", () => {
  describe("age", () => {
    it.todo("should return Infinity if data is never available before");
    it.todo("should return correct data age");
  });

  describe("stale", () => {
    it.todo("should return false if age < maxAge");
    it.todo("should return true if age > maxAge");
  });

  describe("old", () => {
    it.todo("should return false if age < staleAge");
    it.todo("should return true if age > staleAge");
  });

  describe("get", () => {
    it.todo(
      "should return the value without execute function if status is neither old nor stale"
    );
    it.todo(
      "should return the old value and execute function if status is stale, then on next get immediately return value without execute function"
    );
    it.todo("should execute function and return the value if status is old");
  });
});
