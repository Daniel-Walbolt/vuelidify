import { SyncValidator } from "./finalFormTypes";

/**
 * Contains the validators that used by NetPantry as opposed to generic validators that can be apart of the Vue Final Form package.
 */
export function mustEqual<T, P, V, R>(getter: (parent: P) => T, errorMessage: string): SyncValidator<T, P, V, R> {
	return (params) => ({
		isValid: params.value === getter(params.parent),
		errorMessage: errorMessage
	})
}