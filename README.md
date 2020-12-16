# @tkesgar/reine

[![Build Status](https://travis-ci.org/tkesgar/reine.svg?branch=yagoo)](https://travis-ci.org/tkesgar/reine)
[![codecov](https://codecov.io/gh/tkesgar/reine/branch/yagoo/graph/badge.svg)](https://codecov.io/gh/tkesgar/reine)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@tkesgar/reine)](https://bundlephobia.com/result?p=@tkesgar/reine)
[![npm](https://img.shields.io/npm/dt/@tkesgar/reine)](https://www.npmjs.com/package/@tkesgar/reine)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)

> Ketika ngirim foto cookies buat Moona-senpai terus dikira foto telur dadar...
> 😭

reine provides `createSWR`, a simple in-memory caching helper based on the
[stale-while-revalidate][swr]strategy:

```ts
// Assume that renderToString takes 1000 ms
const renderPage = createSWR(() => renderer.renderToString(app, ctx));

app.use(async () => {
  const html = await renderPage();
  return html;
});
```

<p align="center">
  <img src="https://pbs.twimg.com/media/EoepYiwVQAAecTh?format=jpg" alt="Pavolia Reine by 飯田ぽち" width="400">
</p>

<p align="center">
  <i>Pavolia Reine artwork by <a href="https://twitter.com/lizhi3">飯田ぽち</a></i>
</p>

## Installation

```bash
$ npm install @tkesgar/reine
```

## Usage

The module exports a function `createSWR`.

```ts
import createSWR from "@tkesgar/reine";
```

### createSWR<T>(asyncFn, opts = {})

Wraps `asyncFn` using stale-while-revalidate strategy into a new asynchronous
function.

Available options:

- **maxAge** (default: `1000`): the minimum age in miliseconds for the value to
  be considered stale.
- **staleAge** (default: `2000`): the minimum age in miliseconds for the value
  to be considered old.
- **revalidateErrorHandler**: an error handler that will be called with the
  error if `asyncFn` throws an error when trying to revalidate (i.e. value is
  style).
- **initialValue**: if a value is provided, it will be used as initial value.
  The SWR instance will always start at `fresh` state.

```ts
const wrappedFetchData = createSWR(fetchData, {
  maxAge: 30000,
  staleAge: 60000,
  revalidateErrorHandler(err) {
    log.error({ err }, "Failed to fetch data from network; using stale data");
  },
  initialValue: null,
});
```

### wrappedFn.age: number

Returns the age of current value.

If the value is not available yet, the value will be `Infinity`.

### wrappedFn.status: "fresh" | "stale" | "old"

Returns the current state of value based on its age.

### wrappedFn.reset([value])

If no value is provided, sets the status to be "old", causing the next call to
execute the function.

If a value is provided, sets the current value to the provided value and
refreshes the cache.

### wrappedFn(): Promise

Retrieves the value for the function. Depending on the status:

- If status is **fresh**, the currently available data will be returned. The
  function will not be executed.
- If status is **stale**, the currently available data will be returned.
  However, the function will be executed and the value will be "refreshed".
  - If the function throws an error and `revalidateErrorHandler` is available,
    it will be called with the error value as argument.
- If status is **old**, the function will be executed and the value is returned.
  - If the function throws an error, the function will throws the error.

## Recipes

### Simple usage

```ts
const fetchWinner = createSWR(() => fetchData("/api/user/winner/info"));

const winner = await fetchWinner();
console.log(await winner.username);
```

### Log revalidation errors

If there is no error handler, _the error will be silently ignored_; the SWR
instance will return the stale value instead.

It is recommended to provide an error handler to some logging mechanism.

```ts
const fetchWinner = createSWR(() => fetchData("/api/user/winner/info"), {
  revalidationErrorHandler(err) {
    log.warn({ err }, "Failed to fetch winner info; using stale render result");
  },
});

const winner = await fetchWinner();
console.log(await winner.username);
```

### Providing initial value

If an initial value is provided, the state will start as "fresh". This avoids
the first call to be delayed.

```ts
const fetchWinner = createSWR(() => fetchData("/api/user/winner/info"), {
  initialValue: { id: 323, username: "pavolia_reine" },
});

const winner = await fetchWinner();
console.log(await winner.username);
```

### Preload SWR instance

To avoid delays or errors for the first call, simply call the function first.

```ts
const fetchWinner = createSWR(() => fetchData("/api/user/winner/info"));
await fetchWinner();

const winner = await fetchWinner();
console.log(await winner.username);
```

It is possible to make preload non-blocking; however, be aware that the future
call will throw error if the function throws error again.

```ts
const fetchWinner = createSWR(() => fetchData("/api/user/winner/info"));
fetchWinner().catch((err) => {
  log.warn({ err }, "Failed to fetch winner info");
});

const winner = await fetchWinner();
console.log(await winner.username);
```

### Always revalidate

Setting `maxAge` to `0` and `staleAge` to `Infinity` will cause the function to
always revalidate the value on every calls, but returns the stale value
instantly. This behaviour might be desirable if stale values are acceptable and
revalidation is "cheap".

```ts
const fetchWinner = createSWR(() => fetchData("/api/user/winner/info"), {
  maxAge: 0,
  staleAge: Infinity,
});
await fetchWinner();

const winner = await fetchWinner();
console.log(await winner.username);
```

### Cache invalidation

The cache can be invalidated for certain use cases, such as receiving an update
event for the cached resource.

```ts
const fetchWinner = createSWR(() => fetchData("/api/user/winner/info"), {
  revalidateErrorHandler(err) {
    log.warn({ err }, "Failed to fetch winner data");
  },
});

externalService.on("match-finished", () => {
  fetchWinner.reset();
});
```

To avoid delays, simply call the function after invalidating the cache.

```ts
externalService.on("match-finished", () => {
  fetchWinner.reset();
  fetchWinner().catch((err) => {
    log.warn({ err }, "Failed to fetch winner data");
  });
});
```

Alternatively, it is also possible to set the current value.

```ts
externalService.on("match-finished", (result) => {
  fetchWinner.reset(result.winner);
});
```

## Questions

### Does `createSWR` supports custom cache key/function arguments?

No, `createSWR` call returns a single wrapped function that will be executed
without arguments.

### Does `createSWR` supports custom cache storage (e.g. Redis)?

No, only in-memory.

## Contribute

Feel free to [send issues][issues] or [create pull requests][pulls].

## License

Licensed under MIT License.

[issues]: https://github.com/tkesgar/reine/issues
[pulls]: https://github.com/tkesgar/reine/pulls
[swr]: https://web.dev/stale-while-revalidate/
