import { Ref, ref } from "vue";

/**
 * Buffers a function such that only the latest invocation will be executed after the previous finishes.
 * Intermediate calls resolve to undefined.
 *
 * @example
 * const buffered = bufferAsync(someAsyncFn);
 * buffered('a'); // executes
 * buffered('b'); // queued but will resolve to undefined
 * buffered('c'); // queued and will executed after first completes
 *
 * @param func The function to apply a buffer to
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
 * Throttles a function such that it is only called once per delay period.
 *
 * Calls during the throttle return a promise to execute the function after the throttle.
 * Only the latest queued call will execute; the rest resolve to undefined.
 *
 * Useful when you want to avoid spamming a resource and using the latest parameters is important.
 *
 * @example
 * async function saveInput(input: string) { ... }
 * const throttledSave = throttleQueueAsync(saveInput, 1000);
 *
 * throttledSave("a"); // Executes immediately
 * throttledSave("b"); // Queued but will resolve to undefined
 * throttledSave("c"); // Replaces "b", starts after 1s
 *
 * // Only "a" and "c" will be processed
 *
 * @param func - The function to throttle.
 * @param delayMs - Time between invocations.
 * @returns A throttled version of the function.
 */
export function throttleQueueAsync<F extends (...args: any[]) => any>(
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
 * Adds debounce behavior to a function.
 *
 * Waits for the specified delay after the last call before executing.
 * All previous calls during the delay are ignored.
 *
 * Useful for handling events like search input or autosave.
 *
 * @example
 * async function fetchResults(query: string) { ... }
 * const debouncedFetch = debounceAsync(fetchResults, 500);
 *
 * debouncedFetch("a");
 * debouncedFetch("ab");
 * debouncedFetch("abc"); // Only this call will be executed after 500ms
 *
 * @param func - The async function to debounce.
 * @param delay - Delay in milliseconds after the last call before execution.
 * @returns A debounced version of the function.
 */
export function debounceAsync<F extends (...args: any) => any>(
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
				if (timeout) {
					// This is the first attempt at preventing execution of previous calls
					// While not strictly necessary for safety, clearing timeouts as we don't
					// need them is a performance consideration.
					clearTimeout(timeout);
				}
				timeout = setTimeout(async () => {
					// This is the second attempt at preventing execution of previous calls
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
 * Throttles an async function, ensuring it's only called once per delay period.
 *
 * Calls during the delay are ignored. The first call after the delay runs immediately.
 *
 * Useful for hard limiting repeated actions (e.g., form submissions or API calls).
 *
 * @param func - The async function to throttle.
 * @param delayMs - Minimum time (in ms) between allowed calls.
 * @returns A ref indicating throttle state and the throttled function.
 */
export function throttleAsync<F extends (...args: any) => any>(
	func: F,
	delayMs: number,
): {
	isThrottled: Ref<boolean>;
	throttledFunc: (...params: Parameters<F>) => Promise<Awaited<ReturnType<F>> | undefined>;
} {
	const isThrottled: Ref<boolean> = ref(false);
	const throttledFunc = async (...params: Parameters<F>) => {
		if (isThrottled.value) {
			return undefined;
		}
		isThrottled.value = true;
		setTimeout(() => isThrottled.value = false, delayMs);
		return await func(...params);
	};
	return {
		isThrottled,
		throttledFunc: throttledFunc,
	};
}
