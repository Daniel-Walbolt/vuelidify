import { computed, type MaybeRefOrGetter, reactive, type Ref, ref, toValue } from "vue";
import type {
	AnyGenericValidationType,
	GenericArrayValidation,
	GenericObjectValidation,
	GenericValidation,
	GenericValidationState,
	GenericValidator,
	IndexableGenericValidation,
	IndexableObject,
	ProcessedValidator,
	PropertyValidationConfig,
} from "../privateTypes.ts";
import { reduceUndefined } from "../utilFunctions.ts";

function uniqueId() {
	return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function setupValidation(
	object: Ref<unknown>,
	validation: GenericValidation,
) {
	const validationSetup = setupNestedPropertiesForValidation(
		object,
		validation,
	);
	return validationSetup;
}

/**
 * Takes in a list of validators and returns an equally sized list of processed validators.
 * Processed validators have additional information tied to the validator function itself.
 * @param validators
 * @param markReactive
 */
export function processValidators(
	validators: GenericValidator[],
	/** Mark the processed validators as reactive or lazy */
	markReactive: boolean,
	/** Change how the ID is assigned. Will use the provided ID and simply attach the validator's index to it. */
	useExistingIdWithIndex?: string,
): ProcessedValidator[] {
	const processedValidators: ProcessedValidator[] = [];
	let getId: (index?: number) => string = () => `${markReactive ? "reactive" : "lazy"}-${uniqueId()}`;
	if (useExistingIdWithIndex != undefined) {
		getId = (index?: number) => `${useExistingIdWithIndex}-${index}`;
	}
	for (const [index, validator] of validators.entries()) {
		processedValidators.push({
			validatorId: getId(index),
			validator: validator,
			optimized: false,
			isReactive: markReactive,
			previouslyReturnedValidators: false,
			previouslySpawnedValidators: {},
			spawnedValidators: {},
		});
	}
	return processedValidators;
}

/**
 * Performs setup of validation on a property. Creates a property validation config, and validation state object for it.
 */
export function createValidationConfig(
	object: Ref<unknown>,
	validation: AnyGenericValidationType,
	/** Specify the getters for the array parents that came before this property. */
	arrayParents: object[] = [],
) {
	// Create a reactive object for the validation state just for convenience.
	// Users don't have to type .value on any of the these properties in
	// JavaScript or in the Vue templates while still having reactivity.
	//
	// Type is casted because TypeScript is unable to infer the type in strict mode (I think that's the problem)
	const validationState: GenericValidationState = reactive({
		$state: {
			isValid: computed(() => {
				// If the lazy validators are undefined, then they haven't been called yet. The property can not be guaranteed to be valid until these validators are ran.
				const isLazyValid = validationConfig.isLazyValid.value ?? false;
				// If the reactive validators are undefined then they haven't been called yet. The property can not be guaranteed to be valid.
				const isReactiveValid = validationConfig.isReactiveValid.value ?? false;
				return isLazyValid && isReactiveValid;
			}),
			/** State indicating that validators are currently being called. */
			isValidating: computed(() =>
				validationConfig.isValidatingReactive.value ||
				validationConfig.isValidatingLazy.value
			),
			isErrored: computed(() =>
				validationState.$state?.resultsArray.some((x) => x.isValid === false) ??
					false
			),
			/** Array of the error messages that come from the {@link validationResults[]} for ease of use. */
			errorMessages: computed(() =>
				reduceUndefined(
					validationState.$state?.resultsArray ?? [],
					(val) => val.isValid ? undefined : val.message,
				)
			),
			results: computed(() => validationConfig.namedValidationResults.value),
			resultsArray: computed(() => validationConfig.validationResults.value),
		},
		// Important to note that if nothing refers to $arrayState, it will never execute.
		// So if something depends on a byproduct of this computed function, it may not behave as expected.
		$arrayState: computed(() => {
			// Array state should be empty until the value is actually an array.
			if (
				Array.isArray(object.value) === false ||
				validationConfig.elementValidation === undefined
			) {
				return [];
			}

			// Declare some variables for readability
			const arr = object.value;
			const elValidation = validationConfig.elementValidation;
			/** Maps element IDs to their validation config for O(1) lookups */
			const validationMap = validationConfig.arrayConfigMap;

			// Generate the list of validation states
			const elemValidationState: GenericValidationState[] = [];
			// Generate a new validation map to get rid of old data.
			const prunedValidationMap: typeof validationMap = {};

			/** Stores the ID for the object that is currently being handled in the loop */
			let tempId;
			/** Stores the IDs of elements, indicating their order in the array. Validation state will then be returned in the same order. */
			const elementIds: string[] = [];

			for (let i = 0; i < arr.length; i++) {
				const isObject = arr[i] !== undefined && typeof arr[i] === "object";
				// Give the object an ID if it doesn't already have one.
				// This step is crucial in order to know what validation state this object is bound to.
				if (isObject) {
					if (arr[i].$ffId === undefined) {
						// Use define property to make this property invisible to enumerators
						// Concatenates the ID of the array validator with a unique number within the array.
						Object.defineProperty(
							arr[i],
							"$ffId",
							{
								value: `${validationConfig.id}-${validationConfig.elementId++}`,
								writable: false,
								configurable: false,
								enumerable: false,
							},
						);
					}
					// Store the id so we can use it to keep track of the validation config.
					tempId = arr[i].$ffId;
				} else if (arr[i] !== undefined) {
					// The item in the array is a primitive, Object.defineProperty() will not work.
					// We are unable to reliably relate this primitive to the validation config that was made for it.
					// This means the order of validation state for the array is not guaranteed to be accurate,
					// i.e. the validation state at index 0 might not contain (all) the results for the primitive at index 0,
					// the user should NOT change the order of the primitives in the array.
					// This is because if lazy validation is done on any of the indexes, it won't move with the primitive value within the array.
					tempId = i;
				}

				elementIds.push(tempId);

				// Skip setup of validation if this element already has a validation config.
				if (validationMap[tempId]) {
					elemValidationState.push(validationMap[tempId].validationState);
					prunedValidationMap[tempId] = validationMap[tempId];
					continue;
				}

				// Setup validation
				const target = computed(() => arr[i]);
				// Create a new array containing the current ancestors to pass into descendant validation configs.
				const ancestors = [...validationConfig.arrayAncestors];
				if (isObject) {
					ancestors.push({
						ancestor: target,
						array: arr,
						index: i,
					});
				}
				const elValidationSetup = setupNestedPropertiesForValidation(
					target,
					elValidation,
					ancestors,
				);
				validationMap[tempId] = {
					validationConfigs: elValidationSetup.validationConfigs,
					validationState: elValidationSetup.state,
				};
				elemValidationState.push(validationMap[tempId].validationState);
				prunedValidationMap[tempId] = validationMap[tempId];
			}
			validationConfig.arrayConfigMap = prunedValidationMap;
			return elemValidationState;
		}),
	}) as GenericValidationState;

	// If there are no lazy validators, lazy validation is automatically valid (true).
	let initIsLazyValid = true;
	// If there are no reactive validators, reactive validation is automatically valid (true).
	let initIsReactiveValid = true;
	let reactiveValidators: ProcessedValidator[] = [];
	let lazyValidators: ProcessedValidator[] = [];
	if (validation.$reactive && validation.$reactive.length > 0) {
		initIsReactiveValid = false;
		reactiveValidators = processValidators(validation.$reactive, true);
	}

	if (validation.$lazy && validation.$lazy?.length > 0) {
		initIsLazyValid = false;
		lazyValidators = processValidators(validation.$lazy, false);
	}

	const validationConfig: PropertyValidationConfig = {
		id: uniqueId(),
		reactiveIterationId: 0,
		lazyIterationId: 0,
		isReactiveValid: ref(initIsReactiveValid),
		isValidatingReactive: ref(false),
		reactiveProcessedValidators: reactiveValidators,
		isLazyValid: ref(initIsLazyValid),
		isValidatingLazy: ref(false),
		lazyProcessedValidators: lazyValidators,
		target: object,
		validation: validation,
		validationState: validationState,
		validationResults: ref([]),
		namedValidationResults: ref({}),
		arrayConfigMap: {},
		elementId: 0,
		elementValidation: (validation as GenericArrayValidation).$each,
		arrayAncestors: reactive(arrayParents),
	};
	return validationConfig;
}

/** Analyzes the validation rules provided and sets up the validation that it represents. */
export function setupNestedPropertiesForValidation(
	object: MaybeRefOrGetter<unknown>,
	validation: GenericValidation | undefined,
	arrayParents: object[] = [],
) {
	/** Validation configs created from the provided validation rules. */
	const configs: PropertyValidationConfig[] = [];
	/** Validation state created from the provided validation rules */
	let state: GenericValidationState = {};

	// Check if the validation object provided has validation
	if (isValidation(validation)) {
		const target = computed(() => toValue(object));
		const validatedPropertyConfig = createValidationConfig(
			target,
			validation,
			arrayParents,
		);
		configs.push(validatedPropertyConfig);
		state = validatedPropertyConfig.validationState;
	}

	if (validation != undefined) {
		// Recursively find nested validation objects
		recursiveSetup(object, validation, state);
	}

	/** Recursive function to iterate through a validation object and create validation configs. */
	function recursiveSetup(
		rObject: MaybeRefOrGetter<unknown>,
		rValidation: GenericValidation,
		rState: GenericValidationState,
	) {
		// Early return
		if (isGenericRecord<IndexableGenericValidation>(rValidation) === false) {
			return;
		}

		for (const key in rValidation) {
			// Early continue if we're not looking at possible nested validation rules.
			if (key === "$reactive" || key === "$lazy" || key === "$each") {
				continue;
			}

			/**
			 * Can return null, undefined, a primitive, array, or custom object.
			 * Note, this has to be a getter Ref in order to maintain reactivity.
			 */
			const target = computed(() => {
				const obj = toValue(rObject);
				if (isGenericRecord<IndexableObject>(obj)) {
					return obj[key];
				} else {
					console.error(
						`Vuelidify Error: validation could not be setup correctly on ${obj} because ${rObject} is not enumerable.`,
					);
					return null;
				}
			});
			const maybeNestedValidation = rValidation[key];

			if (isValidation(maybeNestedValidation)) {
				const setup = createValidationConfig(
					target,
					maybeNestedValidation,
					arrayParents,
				);
				configs.push(setup);
				rState[key] = setup.validationState;
			}

			if (isGenericRecord(maybeNestedValidation)) {
				// This property is an object that may have nested properties
				const nestedState = rState[key] ?? {};
				rState[key] = nestedState;
				recursiveSetup(
					target,
					maybeNestedValidation,
					nestedState,
				);
			}
		}
	}

	return {
		/** All the validation configs from all the validators the user defined */
		validationConfigs: configs,
		/** The object that can be used to represent that state of validation for the provided object. */
		state: state,
	};
}

/** Checks if the object provided contains properties specific to validation. */
export function isValidation(
	maybeValidation: AnyGenericValidationType | undefined | null,
): maybeValidation is AnyGenericValidationType {
	return Array.isArray((maybeValidation as GenericValidation)?.$reactive) ||
		Array.isArray((maybeValidation as GenericValidation)?.$lazy) ||
		(maybeValidation as GenericArrayValidation)?.$each !== undefined;
}

/** Checks if an object is of the type Record<>. */
export function isGenericRecord<T>(object: unknown): object is T {
	return typeof object === "object" && object !== null &&
		!Array.isArray(object);
}

/** Checks if the validation object provided contains properties specific to object validation */
export function isObjectValidation(
	validation: AnyGenericValidationType,
): validation is GenericObjectValidation {
	return Array.isArray((validation as GenericObjectValidation)?.$reactive) ||
		Array.isArray((validation as GenericObjectValidation)?.$lazy);
}
