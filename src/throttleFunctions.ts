import { Ref, ref } from "vue";

/**
 * Buffers a function such that only one instance of the function executes at a time.
 *
 * Calls during execution return a promise to execute the function after current execution finishes.
 * Only the latest buffered call will execute the function; the rest resolve to undefined.
 *
 * @param func The function to apply a buffer to.
 *
 * @example
 * const buffered = bufferAsync(someAsyncFn);
 * buffered('a'); // executes
 * buffered('b'); // queued but will resolve to undefined
 * buffered('c'); // queued and will executed after first completes
 */
export function bufferAsync<F extends (...args: any[]) => any>(
	func: F,
): (...params: Parameters<F>) => Promise<Awaited<ReturnType<F>> | undefined> {
	/** Used to identify concurrent iterations of this function. */
	let callId: number = 0;
	let pending: Promise<unknown> | undefined;

	return (...params: Parameters<F>) => {
		const currentId = ++callId;

		const result = (pending ?? Promise.resolve()).then(() => {
			if (currentId !== callId) {
				return undefined;
			}
			return func(...params);
		});

		pending = result.finally(() => {
			if (currentId === callId) {
				pending = undefined;
			}
		});
		return result;
	};
}

/**
 * Throttles and buffers a function such that it is only called once per delay period.
 *
 * Calls during the throttle return a promise to execute the function after the throttle.
 * Only the latest buffered call will execute; the rest resolve to undefined.
 *
 * Useful when you want to avoid spamming a resource and using the latest parameters is important.
 *
 * @param func - The function to throttle.
 * @param delayMs - Time between invocations.
 * @returns A throttled version of the function.
 *
 * @example
 * async function saveInput(input: string) { ... }
 * const throttledSave = throttleBufferAsync(saveInput, 1000);
 *
 * throttledSave("a"); // Executes immediately
 * throttledSave("b"); // Queued but will resolve to undefined
 * throttledSave("c"); // Replaces "b", starts after 1s
 *
 * // Only "a" and "c" will be processed
 */
export function throttleBufferAsync<F extends (...args: any[]) => any>(
	func: F,
	delayMs: number,
): (...params: Parameters<F>) => Promise<Awaited<ReturnType<F>> | undefined> {
	/** Used to identify concurrent iterations of this function. */
	let callId: number = 0;
	let lastCallTime = 0;
	return async (...params: Parameters<F>) => {
		const currentId = ++callId;
		const now = Date.now();
		const timeSinceLast = now - lastCallTime;

		if (timeSinceLast < delayMs) {
			// Wait for the remaining time of the throttle
			await new Promise((r) => setTimeout(r, delayMs - timeSinceLast));
			if (currentId !== callId) {
				// Skip outdated calls
				return undefined;
			}
		}
		lastCallTime = Date.now();
		return func(...params);
	};
}

/**
 * Adds trailing debounce behavior to a function.
 *
 * Waits for the specified delay after the last call before executing.
 * All previous calls during the delay are ignored. Guarantees the call will have the latest parameters.
 *
 * @param func - The async function to debounce.
 * @param delay - Delay in milliseconds after the last call before execution.
 * @returns A debounced version of the function.
 *
 * @example
 * async function fetchResults(query: string) { ... }
 * const debouncedFetch = trailingDebounceAsync(fetchResults, 500);
 *
 * debouncedFetch("a");
 * debouncedFetch("ab");
 * debouncedFetch("abc"); // Only this call will be executed after 500ms
 */
export function trailingDebounceAsync<F extends (...args: any) => any>(
	func: F,
	delayMs: number,
): (...params: Parameters<F>) => Promise<Awaited<ReturnType<F>> | undefined> {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	/** Used to identify concurrent iterations of this function. */
	let callId = 0;
	return async (...params: Parameters<F>) =>
		new Promise<Awaited<ReturnType<F>> | undefined>(
			(resolve) => {
				const currentId = ++callId;
				setTimeout(async () => {
					// This is the second attempt at preventing execution of previous calls
					// if debounce is called sufficiently fast (i.e. programmatically)
					// some iterations will pass the first if check at the same time, but
					// this check won't succeed.
					if (currentId == callId) {
						resolve(await func(...params));
					} else {
						resolve(undefined);
					}
				}, delayMs);
			},
		);
}

/**
 * Throttles a function, ensuring it's called once per delay period.
 *
 * Calls during the delay are ignored, and the first call after the delay executes immediately.
 *
 * Useful for hard limiting actions (e.g. form submissions or API calls).
 *
 * @param func - The function to throttle.
 * @param delayMs - The minimum time (in milliseconds) between calls.
 * @returns A ref indicating throttle state and the throttled function.
 *
 * @example
 * async function fetchResults(query: string) { ... }
 * const { throttledFunc } = throttleAsync(fetchResults, 500);
 *
 * throttledFunc("a"); // executes immediately
 * throttledFunc("ab"); // ignored
 * // ... 500 ms later ...
 * throttledFunc("abc"); // executes immediately
 */
export function throttleAsync<F extends (...args: any) => any>(
	func: F,
	delayMs: number,
): {
	isThrottled: Ref<boolean>;
	throttledFunc: (...params: Parameters<F>) => ReturnType<F> | undefined;
} {
	const isThrottled: Ref<boolean> = ref(false);
	const throttledFunc = (...params: Parameters<F>) => {
		if (isThrottled.value) {
			return undefined;
		}
		isThrottled.value = true;
		setTimeout(() => isThrottled.value = false, delayMs);
		return func(...params);
	};
	return {
		isThrottled,
		throttledFunc: throttledFunc,
	};
}
