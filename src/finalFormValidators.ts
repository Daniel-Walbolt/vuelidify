import { AsyncValidator, BaseValidationReturn, SyncValidator, ValidatorParams } from "./finalFormTypes";
import { flatMap, reduceUndefined } from "./finalFormUtilities";

/** 
 * Makes sure the object is not undefined and the trim length is greater than 0.
 * @param value
 * @returns Synchronous validator
 */
export function required<T,P,V,R>(): SyncValidator<T, P, V, R> {
	return (params: ValidatorParams<T, P, V>) => ({
		isValid: params.value != undefined && String(params.value).trim().length > 0,
		errorMessage: "This field is required"
	});
}

/**
 * Validates the provided validators if the provided condition is true.
 * @param condition the condition to evaluate before executing validators.
 * @param validators the validators that get executed if the condition returns true.
 * @returns Asynchronous validator
 */
export function validateIf<T,P,V,R>(
	condition: (parent: P, args: V) => boolean,
	validators: (SyncValidator<T, P, V, R> | AsyncValidator<T, P, V, R>)[]
): AsyncValidator<T,P, V, R> {
	return async (params: ValidatorParams<T, P, V>) => {
		if (condition(params.parent, params.args) == false) {
			return {
				isValid: true
			}
		}
		const promises: Promise<BaseValidationReturn | undefined>[] = [];
		const results: BaseValidationReturn<R>[] = [];
		for (const validator of validators) {
			const validationReturn = validator(params);
			if (validationReturn instanceof Promise) {
				promises.push(validationReturn);
			} 
			else {
				results.push(validationReturn);
			}
		}
		const asyncResults = await Promise.all(promises);
		results.push(...reduceUndefined(asyncResults));
		const failedValidationErrorMessages = results.filter(x => !x.isValid).map((x => x.errorMessage));
		const errorMessages = flatMap(failedValidationErrorMessages);
		return {
			isValid: results.every(x => x.isValid == true),
			errorMessage: errorMessages
		}
	}
}

/**
 * Makes sure the string to validate has a length >= to the provided length. Undefined strings are treated as 0 length.
 * @param minLength 
 * @returns Synchronous validator
 */
export function minimumLength<T extends string | number | undefined | null,P,V,R>(minLength: number): SyncValidator<T, P, V, R> {
	return (params: ValidatorParams<T, P, V>) => {
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
export function maximumLength<T extends string | undefined | null, P, V, R>(maxLength: number): SyncValidator<T, P, V, R> {
	return (params: ValidatorParams<T, P, V>) => ({
		isValid: (params.value?.length ?? 0) <= maxLength,
		errorMessage: `Too long (${params.value?.length ?? 0} / ${maxLength})`
	});
}

/**
 * Makes sure the number to validate is not undefined and is atleast the provided value.
 * @param minValue 
 * @returns Synchronous validator
 */
export function minValue<T extends number | undefined | null, P, V, R>(minValue: number): SyncValidator<T, P, V, R> {
	return (params: ValidatorParams<T, P, V>) => ({
		isValid: params.value != undefined && params.value >= minValue,
		errorMessage: `Must be atleast ${minValue}`
	})
}

/**
 * Checks if the string value is a valid looking email using RegEx.
 * @returns Synchronous validator
 */
export function isEmailSync<T extends string | undefined | null, P, V, R>(): SyncValidator<T, P, V, R> {
	return (params: ValidatorParams<T, P, V>) => ({
		isValid: params.value ? RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(params.value) : false,
		errorMessage: "Invalid email format"
	});
}

// Feel free to add additional validators here!!
