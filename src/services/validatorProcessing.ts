import { computed, type ComputedRef, type MaybeRefOrGetter, reactive, type Ref, ref, toValue } from 'vue';
import type { AnyValidatorType, IndexableObject, ObjectValidation, PrimitiveOrArrayValidation, ProcessedValidator, PropertyValidationConfig } from '../privateTypes.ts';
import { reduceUndefined } from '../throttleFunctions.ts';
import type { ArrayValidationState, ArrayValidationTypes, Validation, Primitive, PrimitiveValidationState, BaseValidationTypes, RecursiveValidation, RecursiveValidationState, ValidationState, Validator } from '../publicTypes.ts';

function uniqueId() {
	return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function setupValidation<
	G,
	KParent,
	Args,
	FValidationReturn
>(
	object: Ref<G>,
	validation: Validation<G, Args, FValidationReturn, KParent>
) {
	const validationSetup = setupNestedPropertiesForValidation(object, validation);
	const propertyState = reactive(validationSetup.state as ValidationState<G, FValidationReturn>);
	const validationConfigs = validationSetup.validationConfigs;
	return {
		propertyState,
		validationConfigs
	};
}

/**
 * Takes in a list of validators and returns an equally sized list of processed validators.
 * Processed validators have additional information tied to the validator function itself.
 * @param validators
 * @param markReactive
 */
export function setupValidators<
	G,
	KParent,
	Args,
	FValidationReturn
>(
	validators: Validator<G, KParent, Args, FValidationReturn, unknown>[],
	/** Mark the processed validators as reactive or lazy */
	markReactive: boolean,
	/** Change how the ID is assigned. Will use the provided ID and simply attach the validator's index to it. */
	useExistingIdWithIndex?: string
): ProcessedValidator<G, KParent, Args, FValidationReturn>[] {
	const processedValidators: ProcessedValidator<G, KParent, Args, FValidationReturn>[] = [];
	let getId: (index?: number) => string = () => `${markReactive ? 'reactive' : 'lazy'}-${uniqueId()}`;
	if (useExistingIdWithIndex != undefined) {
		getId = (index?: number) => `${useExistingIdWithIndex}-${index}`;
	}
	for (const [index,validator] of validators.entries()) {
		processedValidators.push({
			validatorId: getId(index),
			validator: validator,
			optimized: false,
			isReactive: markReactive,
			previouslyReturnedValidators: false,
			previouslySpawnedValidators: {},
			spawnedValidators: {}
		});
	}
	return processedValidators;
}

/**
 * Performs setup of validation on a property. Creates a property validation config, and validation state object for it.
 */
export function setupPropertyValidation<G, KParent, Args, FValidationReturn>(
	object: Ref<G>,
	validation: AnyValidatorType<KParent, Args, FValidationReturn, unknown, number>,
	/** Specify the getters for the array parents that came before this property. */
	arrayParents: object[] = []
) {
	// Create a reactive object for the validation state just for convenience.
	// Users don't have to type .value on any of the these properties in
	// JavaScript or in the Vue templates while still having reactivity.
	const validationState: PrimitiveValidationState<FValidationReturn> & ArrayValidationState<unknown, FValidationReturn> = reactive({
		$state: {
			isValid: computed(() => {
				// If the lazy validators are undefined, then they haven't been called yet. The property can not be guaranteed to be valid until these validators are ran.
				const isLazyValid = validationConfig.isLazyValid.value ?? false;
				// If the reactive validators are undefined then they haven't been called yet. The property can not be guaranteed to be valid.
				const isReactiveValid = validationConfig.isReactiveValid.value ?? false;
				return isLazyValid && isReactiveValid;
			}),
			/** State indicating that validators are currently being called. */
			isValidating: computed(() => validationConfig.isValidatingReactive.value || validationConfig.isValidatingLazy.value),
			isErrored: computed(() => validationState.$state.resultsArray.some(x => x.isValid === false)),
			/** Array of the error messages that come from the {@link validationResults[]} for ease of use. */
			errorMessages: computed(() => reduceUndefined(validationState.$state.resultsArray, val => val.isValid ? undefined : val.message)),
			results: computed(() => validationConfig.namedValidationResults.value),
			resultsArray: computed(() => validationConfig.validationResults.value),
		},
		$arrayState: computed(() => {
			// Array state should be empty until the object is actually an array.
			if (Array.isArray(object.value) === false || validationConfig.elementValidation === undefined) {
				return [];
			}
			// Declare some variables for readability
			const arr = object.value;
			const elValidation = validationConfig.elementValidation;
			const validationMap = validationConfig.arrayConfigMap;

			// Generate the list of validation states
			const elemValidationState: RecursiveValidationState<unknown, FValidationReturn>[] = [];
			// Generate a new validation map to get rid of old data.
			const prunedValidationMap: typeof validationMap = {};

			/** Stores the ID for the object that is currently being handled in the loop */
			let tempId;
			/** Stores the IDs of objects, indicating their order in the array. Validation state will then be created in the same order. */
			const objectIds: string[] = [];

			for (let i = 0; i < arr.length; i++) {
				const isObject = arr[i] !== undefined && typeof arr[i] === 'object';
				// Give the object an ID if it doesn't already have one.
				// This step is crucial in order to know what validation state this object is bound to.
				if (isObject) {
					if (arr[i].$ffId === undefined) {
						// Use define property to make this property invisible to enumerators
						// Concatenates the ID of the array validator with a unique number within the array.
						Object.defineProperty(
							arr[i],
							'$ffId',
							{
								value: `${validationConfig.id}-${validationConfig.elementId++}`,
								writable: false,
								configurable: false,
								enumerable: false
							},
						);
					}
					// Store the id on the object so we can use it to keep track of the validation config.
					tempId = arr[i].$ffId;
				} else if (arr[i] !== undefined) {
					// The item in the array is a primitive, Object.defineProperty() will not work.
					// We are unable to uniquely identify this primitive to the validation config that was made for it.
					// This means the order of validation state for the array is not guaranteed to be accurate,
					// i.e. the validation state at index 0 might not contain (all) the results for the primitive at index 0,
					// the user must NOT change the order of the primitives in the array.
					// This is because if lazy validation is done on any of the indices, it won't move with the primitive value.
					tempId = i;
				}
				
				objectIds.push(tempId);

				// Skip setting up validation if this object already has a validation configuration
				if (validationMap[tempId]) {
					elemValidationState.push(validationMap[tempId].validationState);
					prunedValidationMap[tempId] = validationMap[tempId];
					continue;
				}

				if (isPrimitiveOrArray(elValidation)) {
					// Because this is a primitive, we can't use an object reference.
					const primitiveGetter = computed(() => arr[i]) as ComputedRef<Primitive>;
					const typedValidation = elValidation as BaseValidationTypes<Primitive | undefined, KParent, Args | undefined, FValidationReturn, unknown>;
					const elValidationConfig = setupPropertyValidation(
						primitiveGetter,
						typedValidation,
						validationConfig.arrayParents
					);
					validationMap[tempId] = {
						validationConfigs: [elValidationConfig],
						validationState: elValidationConfig.validationState
					};
				} else {
					const typedObject = arr[i] as IndexableObject;
					const typedValidation = elValidation as RecursiveValidation<typeof typedObject, KParent, Args, FValidationReturn, unknown, number>;
					const elValidationSetup = setupNestedPropertiesForValidation(
						typedObject,
						typedValidation,
						validationConfig.arrayParents.concat(typedObject)
					);
					validationMap[tempId] = {
						validationConfigs: elValidationSetup.validationConfigs,
						validationState: elValidationSetup.state
					};
				}
				elemValidationState.push(validationMap[tempId].validationState);
				prunedValidationMap[tempId] = validationMap[tempId];
			}
			validationConfig.arrayConfigMap = prunedValidationMap;
			return elemValidationState;
		})
	});

	// If there are no lazy validators, lazy validation is automatically valid (true).
	let initIsLazyValid = true;
	// If there are no reactive validators, reactive validation is automatically valid (true).
	let initIsReactiveValid = true;
	let reactiveValidators = [];
	let lazyValidators = [];

	if (validation.$reactive?.length > 0) {
		initIsReactiveValid = false;
		reactiveValidators = setupValidators(validation.$reactive, true);
	} else if (validation._reactive?.length > 0) {
		// Validation configs can't have both $reactive and _reactive.
		initIsReactiveValid = false;
		reactiveValidators = setupValidators(validation._reactive, true);
	}

	if (validation.$lazy?.length > 0) {
		initIsLazyValid = false;
		lazyValidators = setupValidators(validation.$lazy, true);
	} else if (validation._lazy?.length > 0) {
		// Validation configs can't have both $lazy and _lazy.
		initIsLazyValid = false;
		lazyValidators = setupValidators(validation._lazy, true);
	}
	
	const validationConfig: PropertyValidationConfig<G, KParent, Args, FValidationReturn> = {
		id: uniqueId(),
		validationIterationId: 0,
		isReactiveValid: ref(initIsReactiveValid),
		isValidatingReactive: ref(false),
		reactiveProcessedValidators: reactiveValidators,
		isLazyValid: ref(initIsLazyValid),
		isValidatingLazy: ref(false),
		lazyProcessedValidators: lazyValidators,
		property: object,
		validation: validation,
		validationState: validationState,
		validationResults: ref([]),
		namedValidationResults: ref({}),
		arrayConfigMap: {},
		elementId: 0,
		elementValidation: (validation as ArrayValidationTypes<unknown, any, KParent, Args, FValidationReturn, any, number>).$each,
		arrayParents: reactive(arrayParents),
	};
	return validationConfig;
}

/** Analyzes the validation config provided and creates validation state for each validatable object. */
export function setupNestedPropertiesForValidation<KParent, Args, FValidationReturn>(
	object: MaybeRefOrGetter<unknown>,
	validation: RecursiveValidation<unknown, KParent, Args, FValidationReturn, unknown, number> | undefined,
	arrayParents: object[] = []
) {
	/** The list of validation configs that were created from the provided object. */
	const resultConfigs: PropertyValidationConfig<unknown, KParent, Args, FValidationReturn>[] = [];
	/** The validation state object for the provided object. */
	let resultState: ValidationState<unknown, FValidationReturn> = {};
	if (validation !== undefined) {
		// Check if the validation provided is immediately validatable.
		if (isPrimitiveOrArray(validation)) {
			const target = computed(() => toValue(object));
			const propertyValidation = validation as AnyValidatorType<KParent, Args, FValidationReturn, any, number>;
			const validatedPropertyConfig = setupPropertyValidation(target, propertyValidation, arrayParents);
			resultConfigs.push(validatedPropertyConfig);
			resultState = validatedPropertyConfig.validationState;
		} else {
			if (isObjectValidation(validation)) {
				const target = computed(() => toValue(object));
				const objectValidation = validation as AnyValidatorType<KParent, Args, FValidationReturn, any, number>;
				const validatedPropertyConfig = setupPropertyValidation(target, objectValidation, arrayParents);
				resultConfigs.push(validatedPropertyConfig);
				resultState = validatedPropertyConfig.validationState;
			}
			recursiveSetup(object, validation);
		}
	}

	/** Recursive function to iterate through the validation object and create validation configs. */
	function recursiveSetup(
		rObject: MaybeRefOrGetter<unknown>,
		rValidation: RecursiveValidation<unknown, KParent, Args, FValidationReturn, unknown, number>
	) {
		for (const key in rValidation) {
			if (key === "$reactive" || key === "$lazy" || key === "_reactive" || key === "_lazy") {
				continue;
			}
			/** 
			 * Can return null, undefined, a primitive, array, or custom object.
			 * Note, this has to be a getter Ref in order to maintain reactivity.
			 */
			const target = computed(() => toValue(rObject)[key]);
			// Based on the validation we are provided, we can reasonably assume if it is validatable.
			if (isPrimitiveOrArray(rValidation[key])) {
				const propertyValidation = rValidation[key] as AnyValidatorType<KParent, Args, FValidationReturn, any, number>;
				const validatedPropertyConfig = setupPropertyValidation(target, propertyValidation, arrayParents);
				resultConfigs.push(validatedPropertyConfig);
				resultState[key] = validatedPropertyConfig.validationState;
			} else {
				const nestedValidation = rValidation[key] as RecursiveValidation<unknown, KParent, Args, FValidationReturn, any, number>;
				if (isObjectValidation(nestedValidation)) {
					// This validation config contains properties used to provide validators.
					const validatedPropertyConfig = setupPropertyValidation(target, nestedValidation, arrayParents);
					resultConfigs.push(validatedPropertyConfig);
					resultState[key] = validatedPropertyConfig.validationState;
				}
				// Lastly, the property is an object that may have nested properties
				// The property can be null, undefined, or a nested object.
				const nestedState = {} as RecursiveValidationState<unknown, FValidationReturn>;
				resultState[key] = nestedState;
				recursiveSetup(
					target,
					nestedValidation
				);
			}
		}
	}

	return {
		/** All the validation configs from all the validators the user defined */
		validationConfigs: resultConfigs,
		/** The object that can be used to represent that state of validation for the provided object. */
		state: resultState
	};
}

/** Checks if the validation object provided  contains properties specified to primitive & array validation. */
export function isPrimitiveOrArray(validation: Validation<unknown, unknown, unknown, unknown>): validation is PrimitiveOrArrayValidation {
	return Array.isArray((validation as PrimitiveOrArrayValidation)?.$reactive) ||
		Array.isArray((validation as PrimitiveOrArrayValidation)?.$lazy) ||
		(validation as PrimitiveOrArrayValidation)?.$each !== undefined;
}

/** Checks if the validation object provided contains properties specific to object validation */
export function isObjectValidation(validation: Validation<unknown, unknown, unknown, unknown>): validation is ObjectValidation {
	return Array.isArray((validation as ObjectValidation)?._reactive) ||
		Array.isArray((validation as ObjectValidation)?._lazy);
}