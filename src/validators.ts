import type { AsyncValidator, SyncValidator, Validator, ValidatorParams } from "./publicTypes.ts";

/**
 * Validates the object is not loosely undefined.
 * This does allow for empty strings. If you need a non-empty value, use {@link notEmpty()}.
 * @param message sets the error message returned.
 */
export function required(message?: string): SyncValidator {
	return (params: ValidatorParams) => {
		return {
			isValid: params.value != undefined,
			message: message ?? "This field is required",
		};
	};
}

/**
 * Validates the object is not loosely undefined and is not an empty string.
 * @param message sets the error message returned.
 */
export function notEmpty(message?: string): SyncValidator {
	return (params: ValidatorParams) => {
		return {
			isValid: params.value != undefined && params.value !== "" && String(params.value).trim().length > 0,
			message: message ?? "Must not be empty",
		};
	};
}

/**
 * Validates a string or number has a length >= to the provided length. Undefined and null are 0 length.
 * @param min the minimum length of the string or number.
 * @param message sets the error message returned.
 */
export function minLength<T extends string | number | undefined | null>(
	min: number,
	message?: string,
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => {
		const val = String(params.value ?? "");
		return {
			isValid: val.length >= min,
			message: message ?? `Too short (${val.length} / ${min})`,
		};
	};
}

/**
 * Validates a string or number's length. Undefined and null are 0 length.
 * @param max the maximum length of the string or number.
 * @param message sets the error message returned.
 */
export function maxLength<T extends string | number | undefined | null>(
	max: number,
	message?: string,
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => {
		const val = String(params.value ?? "");
		return {
			isValid: val.length <= max,
			message: message ?? `Too long (${val.length} / ${max})`,
		};
	};
}

/**
 * Validates a value is a number and is at least some value.
 * @param min the minimum number the value can be.
 * @param message sets the error message returned.
 */
export function minNumber<T extends number | undefined | null>(
	min: number,
	message?: string,
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: typeof params.value === "number" &&
			Number.isFinite(params.value) &&
			params.value >= min,
		message: message ?? `The minimum value is ${min}`,
	});
}

/**
 * Validates a value is a number and is greater than some value.
 * @param min the number the value must be greater than.
 * @param message sets the error message returned.
 */
export function exclusiveMinNumber<T extends number | undefined | null>(
	min: number,
	message?: string,
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: typeof params.value === "number" &&
			Number.isFinite(params.value) &&
			params.value > min,
		message: message ?? `Must be greater than ${min}`,
	});
}

/**
 * Validates a value is a number and is at most some value.
 * @param max the maximum number the value can be.
 * @param message sets the error message returned.
 */
export function maxNumber<T extends number | undefined | null>(
	max: number,
	message?: string,
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: typeof params.value === "number" &&
			Number.isFinite(params.value) &&
			params.value <= max,
		message: message ?? `The maximum value is ${max}`,
	});
}

/**
 * Validates a value is a number and is less than some value.
 * @param max the number the value must be less than.
 * @param message sets the error message returned.
 */
export function exclusiveMaxNumber<T extends number | undefined | null>(
	max: number,
	message?: string,
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: typeof params.value === "number" &&
			Number.isFinite(params.value) &&
			params.value < max,
		message: message ?? `Must be less than ${max}`,
	});
}

/**
 * Validate the provided predicate function.
 * @param fn predicate that returns true if the value is valid.
 * @param message sets the error message returned.
 */
export function must<T, K, V, R, A>(
	fn: (params: ValidatorParams<T, K, V, A>) => boolean,
	message: string,
): SyncValidator<T, K, V, R, A> {
	return (params) => ({
		isValid: fn(params),
		message: message,
	});
}

/**
 * Execute a set of validators only if the provided predicate is true.
 * @param predicate determines if the set of validators should be returned.
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
 * @param message sets the error message returned.
 */
export function isEmailSync<
	T extends string | undefined | null,
>(
	message?: string,
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: params.value
			? RegExp(
				/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
			).test(params.value)
			: false,
		message: message ?? "Invalid email format",
	});
}
