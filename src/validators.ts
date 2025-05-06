import type { SyncValidator, ValidatorParams } from './publicTypes.ts';

/** 
 * Validates the object is not loosely undefined.
 */
export function required(): SyncValidator {
	return (params: ValidatorParams) => {
		return {
			isValid: params.value != undefined,
			message: 'This field is required'
		};
	};
}

/**
 * Validates a string or number has a length >= to the provided length.
 * @param minLength
 */
export function minLength<T extends string | number | undefined | null>(
	minLength: number
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => {
		const val = String(params.value ?? '');
		return {
			isValid: val.length >= minLength,
			message: `Too short (${val.length} / ${minLength})`
		};
	};
}

/**
 * Validates a string or number's length. Undefined is treated as 0 length.
 * @param maxLength the maximum length of the string or number
 */
export function maxLength<T extends string | number | undefined | null>(
	maxLength: number
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => {
		const val = String(params.value ?? '');
		return {
			isValid: val.length <= maxLength,
			message: `Too long (${val.length} / ${maxLength})`
		};
	};
}

/**
 * Validates a number is defined and is at least some value.
 * @param minNumber the minimum number the value can be
 */
export function minNumber<T extends number | undefined | null>(
	minNumber: number
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: params.value != undefined && params.value >= minNumber,
		message: `The minimum value is ${minNumber}`
	});
}

/**
 * Validates a number is undefined and is at most some value.
 * @param maxNumber the maximum number the value can be
 */
export function maxNumber<T extends number | undefined | null>(
	maxNumber: number
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: params.value != undefined && params.value <= maxNumber,
		message: `The maximum value is ${maxNumber}`
	});
}

/**
 * Validate the provided predicate function.
 * @param fn predicate that returns true if the value is valid.
 * @param errorMessage the message to display when the values are not equal.
 */
export function must<T>(
	fn: (params: ValidatorParams<T>) => boolean,
	errorMessage: string
): SyncValidator<T> {
	return (params) => ({
		isValid: fn(params),
		message: errorMessage
	});
}

/**
 * Validates a string is a valid looking email using RegEx.
 * 
 * The RegEx was taken from https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript, and may be updated in the future.
s */
export function isEmailSync<T extends string | undefined | null>(): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: params.value ? RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(params.value) : false,
		message: "Invalid email format"
	});
}