# @tkesgar/reine

[![Build Status](https://travis-ci.org/tkesgar/reine.svg?branch=yagoo)](https://travis-ci.org/tkesgar/reine)
[![codecov](https://codecov.io/gh/tkesgar/reine/branch/yagoo/graph/badge.svg)](https://codecov.io/gh/tkesgar/reine)
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

The module exports a class `SWR`:

```ts
import createSWR from "@tkesgar/reine";
```

### createSWR<T>(asyncFn, opts = {})

Wraps `asyncFn` using stale-while-revalidate strategy into a SWR instance
object.

Available options:

- `maxAge` (default: `1000`): the minimum age in miliseconds for the value to be
  considered stale.
- `staleAge` (default: `2000`): the minimum age in miliseconds for the value to
  be considered old.
- `revalidateErrorHandler`: an error handler that will be called with the error
  if `asyncFn` throws an error when trying to revalidate (i.e. value is style).
- `initialValue`: if a value is provided, it will be used as initial value. The
  SWR instance will always start at `fresh` state.

```ts
const swr = createSWR(fetchData, {
  maxAge: 30000,
  staleAge: 60000,
  revalidateErrorHandler(err) {
    log.error({ err }, "Failed to fetch data from network; using stale data");
  },
});
```

### wrappedFn.age: number

Returns the age of value currently stored inside the SWR instance.

If the value is not available, it will be `Infinity`.

### wrappedFn.status: "fresh" | "stale" | "old"

Returns the current state of value based on its age.

### wrappedFn(): Promise<T>

Retrieves the value for the function. Depending on the status of SWR instance,
the function might be executed or not:

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

The simplest usage is to just pass a function. The value will be refreshed if
the age is older than 1 second and will be retrieved again if the age is older
than 2 seconds.

```ts
const fetchMyInfo = createSWR(() => fetchData("/api/user/winner/info"));

const myInfo = await fetchMyInfo();
console.log(await myInfo.username);
```

### Log revalidation errors

If there are no error handler is provided, **the error will be silently
ignored**; the SWR instance will return the stale value instead. It is
recommended to provide an error handler to some logging mechanism.

```ts
const fetchMyInfo = createSWR(() => fetchData("/api/user/winner/info"), {
  revalidationErrorHandler(err) {
    log.error(
      { err },
      "Failed to fetch winner info; using stale render result"
    );
  },
});

const myInfo = await fetchMyInfo();
console.log(await myInfo.username);
```

### Providing initial value

If an initial value is available, it can be passed into the SWR instance:

```ts
const fetchMyInfo = createSWR(() => fetchData("/api/user/winner/info"), {
  initialValue: { id: 323, username: "pavolia_reine" },
});

const myInfo = await fetchMyInfo();
console.log(await myInfo.username);
```

### Preload SWR instance

To avoid delays for the first call, simply call the function first.

```ts
const fetchMyInfo = createSWR(() => fetchData("/api/user/winner/info"));
await fetchMyInfo();

const myInfo = await fetchMyInfo();
console.log(await myInfo.username);
```

It is possible to make preload non-blocking; however, be aware that the future
call will throw error if the function throws error again.

```ts
const fetchMyInfo = createSWR(() => fetchData("/api/user/winner/info"));
fetchMyInfo().catch((err) => {
  log.warn({ err }, "Failed to fetch winner info");
});

const myInfo = await fetchMyInfo();
console.log(await myInfo.username);
```

### Always revalidate

Setting `maxAge` to 0 and `staleAge` to Infinity will cause the SWR instance to
always revalidate the value on every calls, but returns the stale value
instantly. This behaviour might be desirable if stale values are preferable and
revalidation is "cheap".

```ts
const fetchMyInfo = createSWR(() => fetchData("/api/user/winner/info"), {
  maxAge: 0,
  staleAge: Infinity,
});
await fetchMyInfo();

const myInfo = await fetchMyInfo();
console.log(await myInfo.username);
```

## Contribute

Feel free to [send issues][issues] or [create pull requests][pulls].

## License

Licensed under MIT License.

[issues]: https://github.com/tkesgar/reine/issues
[pulls]: https://github.com/tkesgar/reine/pulls
[swr]: https://web.dev/stale-while-revalidate/
