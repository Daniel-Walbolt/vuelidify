import { AsyncValidator, SyncValidator, ValidatorParams } from "./finalFormTypes";

/** 
 * Makes sure the object is not undefined and the trim length is greater than 0.
 * @param value
 * @returns Synchronous validator
 */
export function required<T,P,V,R,A>(): SyncValidator<T, P, V, R, A> {
	return (params: ValidatorParams<T, P, V, A>) => ({
		isValid: params.value !== undefined && String(params.value).trim().length > 0,
		errorMessage: "This field is required"
	});
}

/**
 * Validates the provided validators if the provided condition is true.
 * @param condition the condition to evaluate before executing validators.
 * @param validators the validators that get executed if the condition returns true.
 * @returns Asynchronous validator
 */
export function validateIf<T,P,V,R,A>(
	condition: ((params: ValidatorParams<T, P, V, A>) => boolean) | ((params: ValidatorParams<T, P, V, A>) => Promise<boolean>),
	validators: (SyncValidator<T, P, V, R, A> | AsyncValidator<T, P, V, R, A>)[]
): AsyncValidator<T, P, V, R, A> {
	return async (params: ValidatorParams<T, P, V, A>) => {
		if ((await condition(params)) === false) {
			return {
				isValid: true
			}
		}
		return validators;
	}
}

/**
 * Makes sure the string to validate has a length >= to the provided length. Undefined strings are treated as 0 length.
 * @param minLength 
 * @returns Synchronous validator
 */
export function minimumLength<T extends string | number | undefined | null, P, V, R, A>(minLength: number): SyncValidator<T, P, V, R, A> {
	return (params: ValidatorParams<T, P, V, A>) => {
		const val = String(params.value ?? "");
		return {
			isValid: val.length >= minLength,
			errorMessage: `Too short (${val.length} / ${minLength})`
		}
	}
}

/**
 * Makes sure the string to validate is less than the provided length. Undefined strings are treated as 0 length.
 * @param maxLength 
 * @return Synchronous validator
 */
export function maximumLength<T extends string | undefined | null, P, V, R, A>(maxLength: number): SyncValidator<T, P, V, R, A> {
	return (params: ValidatorParams<T, P, V, A>) => ({
		isValid: (params.value?.length ?? 0) <= maxLength,
		errorMessage: `Too long (${params.value?.length ?? 0} / ${maxLength})`
	});
}

/**
 * Makes sure the number to validate is not undefined and is at least the provided value.
 * @param minValue 
 * @returns Synchronous validator
 */
export function minValue<T extends number | undefined | null, P, V, R, A>(minValue: number): SyncValidator<T, P, V, R, A> {
	return (params: ValidatorParams<T, P, V, A>) => ({
		isValid: params.value !== undefined && params.value >= minValue,
		errorMessage: `Must be at least ${minValue}`
	})
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
		errorMessage: "Invalid email format"
	});
}

// Feel free to add additional validators here!!
