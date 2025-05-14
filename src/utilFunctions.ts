/**
 * Accepts an array and uses the provided getter to get any value from each element
 * and ignoring any undefined or null values returned.
 *
 * ```ts
 * const array = [{ id: 123, name: "Foo"}, { id: 456, name: undefined }]
 * const validNames = reduceUndefined(array, v => v.name) // ["Foo"]
 * ```
 * @param array the array to map values from
 * @param getter a function executed with each element which can perform any kind of custom mapping.
 * @returns an array of the getter's return value invoked with each source element, with undefined values omitted.
 */
export function reduceUndefined<T, K = NonNullable<T>>(
	array: T[],
	getter: (value: T) => K | undefined | null = (val) => val as K | undefined | null,
): K[] {
	return array.reduce<K[]>((results, item) => {
		const value = getter(item);
		if (value != undefined) {
			results.push(value);
		}
		return results;
	}, []);
}
