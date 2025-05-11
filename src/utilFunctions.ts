/**
 * Accepts an array and uses the provided getter to get any value from each index ignoring any undefined values.
 *
 * The default getter returns each array element (a map without the possible undefined values).
 *
 * ```ts
 * const array = [{ id: 123, name: "Foo"}, { id: 456, name: undefined }]
 * const validNames = reduceUndefined(array, v => v.name) // ["Foo"]
 * ```
 * @param array the array to map values from
 * @param getter the callback for each element which can return any nested value from each element.
 * @returns an array of the getter's return value invoked with each source element, with undefined values omitted.
 */
export function reduceUndefined<T, K = T>(
	array: T[],
	getter: (value: T) => K | undefined = (val) => val as K | undefined,
) {
	return array.reduce<K[]>((results, item) => {
		const value = getter(item);
		if (value !== undefined) {
			results.push(value);
		}
		return results;
	}, []);
}
