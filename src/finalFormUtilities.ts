/** 
 * Returns a function that will only execute the provided promise returning function
 * with the most recently specified params only if a previously created promise does not exist. 
 */
export function bufferAsync<F extends (...args: any) => any, K>(
	func: (...params: Parameters<F>) => Promise<K>,
): (...params: Parameters<typeof func>) => Promise<K | undefined>
{
	let id: number = 0;
	let queuedFunc: Promise<K | undefined> | undefined = undefined;

	return (...params: Parameters<typeof func>) => {
		const currentId = ++id;
		queuedFunc = queuedFunc?.then(() => {
			// This if check is crucial for ignoring this promise if another one has already been queued.
			if (id == currentId) {
				queuedFunc = func(...params).then((response) => {
					queuedFunc = undefined; // Reset the buffer
					return response;
				});
				return queuedFunc; // Always return the last promise in the buffer
			}
			return undefined; // Return undefined for all intermediate promises.
		}) ?? func(...params).then((response) => { // Init the buffer
			queuedFunc = undefined; // Reset the buffer
			return response; // Always return the first promise in the buffer
		});
		return queuedFunc;
	};
}

/**
 * Gurantees delay between invocations of the given function.
 * 
 * Invocations of the throttled function after the given interval has passed will execute instantly.
 * 
 * Subsequent invocations during the cooldown return a promise to invoke the function after the remaining delay has passed.
 * 
 * Once the interval has passed, all queued promises are executed, but only the latest promise will execute the function. The others will return undefined.
 * @param func the function to throttle
 * @param delay milliseconds required between invocations of the function.
 */
export function throttleQueueAsync<F extends (...args: any) => any, K>(
	func: (...params: Parameters<F>) => K | Promise<K>,
	delay: number
): (...params: Parameters<typeof func>) => Promise<K | undefined>
{
	let id: number = 0;
	let previousExecTime: number | undefined = undefined;
	return (...params: Parameters<typeof func>) => new Promise<K | undefined>(resolve => {
		const currentId = ++id;
		const nowTime = new Date().getTime(); // Get the time of this invocation
		previousExecTime ??= nowTime - delay; // Set initial value if needed
		const remaining = nowTime - previousExecTime - delay; // Calculate time until next interval (negative means time to wait)
		if (remaining < 0) {
			new Promise(resolve => setTimeout(resolve, -1 * remaining))
				.then(() => {
					previousExecTime = new Date().getTime();
					if (currentId == id) {
						resolve(func(...params));
					}
					resolve(undefined);
				});
		} else {
			previousExecTime = nowTime;
			resolve(func(...params));
		}
	});
}

/** 
 * Accepts an array and uses the provided getter to get any value from each index ignoring any undefined values.
 * 
 * The default getter returns each array element (a map without the possible undefined values).
 * @param array the array to map values from
 * @param getter the callback for each element which can return any nested value from each element.
 * @returns an array of the getter's return value invoked with each source element, with undefined values omitted.
 */
export function reduceUndefined<T, K = T>(
	array: T[], 
	getter: (value: T) => K = (val) => val as unknown as K
) {
	return array.reduce((results: NonNullable<K>[], item) => {
		if (item !== undefined) {
			const target = getter(item);
			if (target !== undefined) {
				results.push(target);
			}
		}
		return results;
	}, []);
}

/** 
 * Takes an array that contains a mixed data set of type T and T[] (nested arrays), and reduces it to a 1-dimensional array.
 * 
 * Ignores undefined values as well.
 */
export function flatMap<T>(
	array: (T | T[])[]
) {
	return array.reduce((results: NonNullable<T>[], item) => {
		if (item !== undefined) {
			if (item instanceof Array) {
				for (const subitem of item) {
					if (subitem !== undefined) {
						results.push(subitem);
					}
				}
			} else {
				results.push(item);
			}
		}
		return results;
	}, [])
}