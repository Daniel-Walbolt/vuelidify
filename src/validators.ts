import type { AsyncValidator, SyncValidator, Validator, ValidatorParams } from "./publicTypes.ts";

/**
 * Validates the object is not loosely undefined.
 */
export function required(): SyncValidator {
	return (params: ValidatorParams) => {
		return {
			isValid: params.value != undefined,
			message: "This field is required",
		};
	};
}

/**
 * Validates a string or number has a length >= to the provided length. Undefined and null are 0 length.
 * @param min the minimum length of the string or number
 */
export function minLength<T extends string | number | undefined | null>(
	min: number,
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => {
		const val = String(params.value ?? "");
		return {
			isValid: val.length >= min,
			message: `Too short (${val.length} / ${min})`,
		};
	};
}

/**
 * Validates a string or number's length. Undefined and null are 0 length.
 * @param max the maximum length of the string or number
 */
export function maxLength<T extends string | number | undefined | null>(
	max: number,
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => {
		const val = String(params.value ?? "");
		return {
			isValid: val.length <= max,
			message: `Too long (${val.length} / ${max})`,
		};
	};
}

/**
 * Validates a number is defined and is at least some value.
 * @param min the minimum number the value can be
 */
export function minNumber<T extends number | undefined | null>(
	min: number,
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: params.value != undefined && params.value >= min,
		message: `The minimum value is ${min}`,
	});
}

/**
 * Validates a number is defined and is at most some value.
 * @param max the maximum number the value can be
 */
export function maxNumber<T extends number | undefined | null>(
	max: number,
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: params.value != undefined && params.value <= max,
		message: `The maximum value is ${max}`,
	});
}

/**
 * Validate the provided predicate function.
 * @param fn predicate that returns true if the value is valid.
 * @param errorMessage the message to display when the values are not equal.
 */
export function must<T, K, V, R, A>(
	fn: (params: ValidatorParams<T, K, V, A>) => boolean,
	errorMessage: string,
): SyncValidator<T, K, V, R, A> {
	return (params) => ({
		isValid: fn(params),
		message: errorMessage,
	});
}

/**
 * Execute a set of validators only if the provided predicate is true
 * @param predicate Determines if the set of validators should be returned
 * @param validators The set of validators to execute if the predicate returns true.
 */
export function validateIf<T, K, V, R, A, Validators extends Validator<T, K, V, R, A>[]>(
	predicate: (params: ValidatorParams<T, K, V, A>) => boolean | Promise<boolean>,
	validators: Validators,
): AsyncValidator<T, K, V, R, A> {
	return async (params) => {
		if (await predicate(params)) {
			return validators;
		}
	};
}

/**
 * Validates a string is a valid looking email using RegEx.
 *
 * The RegEx was taken from https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript, and may be updated in the future.
s */
export function isEmailSync<
	T extends string | undefined | null,
>(): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: params.value
			? RegExp(
				/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
			).test(params.value)
			: false,
		message: "Invalid email format",
	});
}
