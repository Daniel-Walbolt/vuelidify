import { computed, ComputedRef, MaybeRefOrGetter, reactive, Ref, ref, toValue } from 'vue';
import { IndexableObject, PrimitiveOrArrayValidation, ProcessedValidator, PropertyValidationConfig } from '../privateTypes';
import { reduceUndefined } from '../throttleFunctions';
import { ArrayValidationState, ArrayValidatorTypes, Validation, Primitive, PrimitiveValidationState, PrimitiveValidatorTypes, RecursiveValidation, RecursiveValidationState, ValidationState, Validator, ValidatorTypes } from '../publicTypes';

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
	let propertyState: ValidationState<G, FValidationReturn>;
	let validationConfigs: PropertyValidationConfig<any, KParent, Args, FValidationReturn>[];
	// Based on the validation we are provided, we can assume what the object is supposed to be.
	const isPrimitiveOrArray = isPrimitiveOrArrayValidation(validation);

	if (isPrimitiveOrArray) {
		// The user is attempting to add validation onto a singular property instead of an object.
		// Assert the type of the provided ref to a more accurate type that describes the state of this branch.
		const typedValidation = validation as PrimitiveValidatorTypes<Primitive, KParent, Args, FValidationReturn, any>;
		const typedObject = object as Ref<Primitive>;
		const validatedPropertyConfig = setupPropertyValidation(typedObject, typedValidation);
		propertyState = reactive(validatedPropertyConfig.validationState) as any; // typescript can't comprehend this type
		validationConfigs = [validatedPropertyConfig];
	} else {
		const typedObject = object as Ref<IndexableObject>;
		const typedValidation = validation as RecursiveValidation<typeof typedObject, KParent, Args, FValidationReturn, any, number>;
		const validationSetup = setupNestedPropertiesForValidation<IndexableObject, KParent, Args, FValidationReturn>(typedObject, typedValidation);
		propertyState = reactive(validationSetup.state) as ValidationState<G, FValidationReturn>;
		validationConfigs = validationSetup.validationConfigs;
	}
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
	validators: Validator<G, KParent, Args, FValidationReturn, any>[],
	/** Mark the processed validators as reactive or lazy */
	markReactive: boolean,
	/** Change how the ID is assigned. Will use the provided ID and simply attach the validator's index to it. */
	useExistingIdWithIndex?: string
): ProcessedValidator<G, KParent, Args, FValidationReturn>[] {
	const processedValidators: ProcessedValidator<G, KParent, Args, FValidationReturn>[] = [];
	let getId: (index?: number) => string = () => `${markReactive ? 'reactive' : 'lazy'}-${uniqueId()}`;
	if (useExistingIdWithIndex != undefined) {
		getId = (index: number) => `${useExistingIdWithIndex}-${index}`;
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
	validation: ValidatorTypes<G, KParent, Args, FValidationReturn, any, number>,
	/** Specify the getters for the array parents that came before this property. */
	arrayParents: object[] = []
) {
	// Create a reactive object for the validation state just for convenience.
	// Users don't have to type .value on any of the these properties in
	// JavaScript or in the Vue templates while still having reactivity.
	const validationState: PrimitiveValidationState<FValidationReturn> & ArrayValidationState<any, FValidationReturn> = reactive({
		isValid: computed(() => {
			// If the lazy validators are undefined, then they haven't been called yet. The property can not be guaranteed to be valid until these validators are ran.
			const isLazyValid = validationConfig.isLazyValid.value ?? false;
			// If the reactive validators are undefined then they haven't been called yet. The property can not be guaranteed to be valid.
			const isReactiveValid = validationConfig.isReactiveValid.value ?? false;
			return isLazyValid && isReactiveValid;
		}),
		/** State indicating that validators are currently being called. */
		isValidating: computed(() => validationConfig.isValidatingReactive.value || validationConfig.isValidatingLazy.value),
		isErrored: computed(() => validationState.resultsArray.some(x => x.isValid === false)),
		/** Array of the error messages that come from the {@link validationResults[]} for ease of use. */
		errorMessages: computed(() => reduceUndefined(validationState.resultsArray, val => val.isValid ? undefined : val.errorMessage)),
		results: computed(() => validationConfig.namedValidationResults.value),
		resultsArray: computed(() => validationConfig.validationResults.value),
		arrayState: computed(() => {
			// Array state should be undefined until the object is actually an array.
			if (Array.isArray(object.value) === false || validationConfig.elementValidation === undefined) {
				return [];
			}
			console.time('Array state');
			// Declare some variables for readability
			const arr = object.value;
			const elValidation = validationConfig.elementValidation;
			const validationMap = validationConfig.arrayConfigMap;

			// Generate the list of validation states
			const elemValidationState: RecursiveValidationState<any, FValidationReturn>[] = [];
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

				if (isPrimitiveOrArrayValidation(elValidation)) {
					// Because this is a primitive, we can't use an object reference.
					const primitiveGetter = computed(() => arr[i]) as ComputedRef<Primitive>;
					const typedValidation = elValidation as PrimitiveValidatorTypes<Primitive | undefined, KParent, Args | undefined, FValidationReturn, any>;
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
					const typedValidation = elValidation as RecursiveValidation<typeof typedObject, KParent, Args, FValidationReturn, any, number>;
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
			console.timeEnd('Array state');
			return elemValidationState;
		})
	});

	// If there are no lazy validators, lazy validation is automatically valid (true).
	const initIsLazyValid = !((validation.$lazy?.length ?? -1) > 0);
	// If there are no reactive validators, reactive validation is automatically valid (true).
	const initIsReactiveValid = !((validation.$reactive?.length ?? -1) > 0);

	const reactiveValidators = validation.$reactive ? setupValidators(validation.$reactive, true) : [];
	const lazyValidators = validation.$lazy ? setupValidators(validation.$lazy, false) : [];
	
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
		elementValidation: (validation as ArrayValidatorTypes<unknown, any, KParent, Args, FValidationReturn, any, number>).$each,
		arrayParents: reactive(arrayParents),
	};
	return validationConfig;
}

/** Recursive function that analyzes the object provided, relates properties to validators, and creates validation state for each property. */
export function setupNestedPropertiesForValidation<G extends IndexableObject, KParent, Args, FValidationReturn>(
	object: MaybeRefOrGetter<G>,
	validation: RecursiveValidation<G, KParent, Args, FValidationReturn, any, number> | undefined,
	arrayParents: object[] = []
) {
	const resultConfigs: PropertyValidationConfig<any, KParent, Args, FValidationReturn>[] = [];
	const resultState: ValidationState<IndexableObject, FValidationReturn> = {} as any;
	if (validation !== undefined) {
		recursiveSetup(object, validation);
	}

	/** Recursive function to iterate through the validation object and create validation configs. */
	function recursiveSetup<G extends IndexableObject>(
		rObject: MaybeRefOrGetter<G>,
		rValidation: RecursiveValidation<G, KParent, Args, FValidationReturn, any, number>
	) {
		for (const key in rValidation) {
			/** 
			 * Can return null, undefined, a primitive, array, or custom object.
			 * Note, this has to be a getter Ref.
			 */
			const property = computed(() => toValue(rObject)[key]);
			// Based on the validation we are provided, we can reasonably assume what the object is supposed to be.
			// We can distinguish if this is a validatable property (array or primitive)
			if (isPrimitiveOrArrayValidation(rValidation[key])) {
				const propertyValidation = rValidation[key] as unknown as ValidatorTypes<G[keyof G], KParent, Args, FValidationReturn, any, number>;
				const validatedPropertyConfig = setupPropertyValidation(property, propertyValidation, arrayParents);
				resultConfigs.push(validatedPropertyConfig);
				resultState[key] = validatedPropertyConfig.validationState;
			} else {
				// Lastly, the property is an object with nested properties. The types for validation require a nested object in this case.
				// The property can be null, undefined, or a nested object.
				const nestedState = {} as RecursiveValidationState<G[keyof G], FValidationReturn>;
				const nestedValidation = rValidation[key] as RecursiveValidation<G[keyof G], KParent, Args, FValidationReturn, any, number>;
				resultState[key] = nestedState;
				recursiveSetup(
					property,
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

export function isPrimitiveOrArrayValidation(validation: Validation<any, any, any, any>): validation is PrimitiveOrArrayValidation {
	return (validation as PrimitiveOrArrayValidation)?.$reactive !== undefined ||
		(validation as PrimitiveOrArrayValidation)?.$lazy !== undefined ||
		(validation as PrimitiveOrArrayValidation)?.$each !== undefined;
}