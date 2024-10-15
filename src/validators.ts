import { SyncValidator, ValidatorParams } from './publicTypes';

/** 
 * Makes sure the object is not undefined and the trim length is greater than 0.
 * @param value
 * @returns Synchronous validator
 */
export function required<T,P,V,R,A>(): SyncValidator<T, P, V, R, A> {
	return (params: ValidatorParams<T, P, V, A>) => ({
		isValid: params.value !== undefined && String(params.value).trim().length > 0,
		errorMessage: 'This field is required'
	});
}

/**
 * Makes sure the string or number to validate has a length >= to the provided length.
 * @param minLength 
 * @returns Synchronous validator
 */
export function minLength<T extends string | undefined | null, P, V, R, A>(
	minLength: number
): SyncValidator<T, P, V, R, A> {
	return (params: ValidatorParams<T, P, V, A>) => {
		const val = String(params.value ?? '');
		return {
			isValid: val.length >= minLength,
			errorMessage: `Too short (${val.length} / ${minLength})`
		};
	};
}

/**
 * Makes sure the string or number to validate is less than the provided length. Undefined strings are treated as 0 length.
 * @param maxLength 
 * @return Synchronous validator
 */
export function maxLength<T extends string | number | undefined | null, P, V, R, A>(
	maxLength: number
): SyncValidator<T, P, V, R, A> {
	return (params: ValidatorParams<T, P, V, A>) => {
		const val = String(params.value ?? '');
		return {
			isValid: val.length <= maxLength,
			errorMessage: `Too long (${val.length} / ${maxLength})`
		};
	};
}

/**
 * Makes sure the number to validate is not undefined and is at least the provided value.
 * @param minNumber 
 * @returns Synchronous validator
 */
export function minNumber<T extends number | undefined | null, P, V, R, A>(
	minNumber: number
): SyncValidator<T, P, V, R, A> {
	return (params: ValidatorParams<T, P, V, A>) => ({
		isValid: params.value !== undefined && params.value >= minNumber,
		errorMessage: `The minimum value is ${minNumber}`
	});
}

/**
 * Makes sure the number to validate is not undefined and is at most the provided value.
 * @param maxNumber 
 * @returns Synchronous validator
 */
export function maxNumber<T extends number | undefined | null, P, V, R, A>(
	maxNumber: number
): SyncValidator<T, P, V, R, A> {
	return (params: ValidatorParams<T, P, V, A>) => ({
		isValid: params.value !== undefined && params.value <= maxNumber,
		errorMessage: `The maximum value is ${maxNumber}`
	});
}

/**
 * Checks if the value of this property strictly equals the value returned by the provided getter.
 */
export function mustEqual<T, P, V, R, A>(getter: (params: ValidatorParams<T, P, V, A>) => T, errorMessage: string): SyncValidator<T, P, V, R, A> {
	return (params) => ({
		isValid: params.value === getter(params),
		errorMessage: errorMessage
	});
}

/**
 * Checks if the string value is a valid looking email using RegEx.
 * 
 * The RegEx was taken from https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript, and may be updated in the future.
 * @returns Synchronous validator
 */
export function isEmailSync<T extends string | undefined | null, P, V, R, A>(): SyncValidator<T, P, V, R, A> {
	return (params: ValidatorParams<T, P, V, A>) => ({
		isValid: params.value ? RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(params.value) : false,
		errorMessage: 'Invalid email format'
	});
}

// Feel free to add additional validators here!!
