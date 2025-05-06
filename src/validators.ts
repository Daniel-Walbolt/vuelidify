import type { SyncValidator, ValidatorParams } from './publicTypes.ts';

/** 
 * Makes sure the object is not loosely undefined.
 * @param value
 * @returns Synchronous validator
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
 * Makes sure the string or number to validate has a length >= to the provided length.
 * @param minLength 
 * @returns Synchronous validator
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
 * Makes sure the string or number to validate is less than the provided length. Undefined strings are treated as 0 length.
 * @param maxLength 
 * @return Synchronous validator
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
 * Makes sure the number to validate is not undefined and is at least the provided value.
 * @param minNumber 
 * @returns Synchronous validator
 */
export function minNumber<T extends number | undefined | null>(
	minNumber: number
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: params.value !== undefined && params.value >= minNumber,
		message: `The minimum value is ${minNumber}`
	});
}

/**
 * Makes sure the number to validate is not undefined and is at most the provided value.
 * @param maxNumber 
 * @returns Synchronous validator
 */
export function maxNumber<T extends number | undefined | null>(
	maxNumber: number
): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: params.value !== undefined && params.value <= maxNumber,
		message: `The maximum value is ${maxNumber}`
	});
}

/**
 * Validates a value using a provided predicate function.
 * @param fn predicate that returns true if the value is valid.
 * @param errorMessage the message to display when the values are not equal.
 * @returns Synchronous validator
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
 * Checks if the string value is a valid looking email using RegEx.
 * 
 * The RegEx was taken from https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript, and may be updated in the future.
 * @returns Synchronous validator
 */
export function isEmailSync<T extends string | undefined | null>(): SyncValidator<T> {
	return (params: ValidatorParams<T>) => ({
		isValid: params.value ? RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(params.value) : false,
		message: 'Invalid email format'
	});
}