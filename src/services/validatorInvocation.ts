import { computed, type MaybeRefOrGetter, type Ref, toValue } from "vue";
import type {
	GenericSyncValidator,
	GenericValidator,
	GenericValidatorParams,
	ProcessedValidator,
	PropertyValidationConfig,
} from "../privateTypes.ts";
import { processValidators } from "./validatorProcessing.ts";
import type { BaseValidationReturn } from "../publicTypes.ts";

type ResultProcessor = (
	/** The validation config whose result is being processed */
	propertyConfig: PropertyValidationConfig,
	processedValidator: ProcessedValidator,
	ret: BaseValidationReturn<unknown>,
) => void;

/** The duration of throttling that is put onto validators that take longer than this time to return. */
const ThrottleDurationMs = 250;

/**
 * Handles invoking and optimization of the provided list of validators.
 * @param propertyConfig the config we're validating for
 * @param model the entire model given to the composable
 * @param args the additional arguments to pass to validators
 * @param iterationId this iteration's ID
 * @param currentIterationId getter for the active iteration ID to compare against
 * @param validators the list of validators to invoke and optimize
 * @returns true if all validators passed
 */
export async function invokeAndOptimizeValidators(
	propertyConfig: PropertyValidationConfig,
	model: unknown,
	args: unknown,
	/** Must match latest iteration ID on property config before updating any state. */
	iterationId: number,
	currentIterationId: MaybeRefOrGetter<number>,
	validators: ProcessedValidator[],
) {
	let isAllValid = true;

	// Create a callback to process the result of each validator.
	const resultProcessor: ResultProcessor = (
		propertyConfig: PropertyValidationConfig,
		processedValidator: ProcessedValidator,
		ret: BaseValidationReturn<unknown>,
	) => {
		// Don't perform any updates if this isn't the latest iteration
		if (iterationId !== toValue(currentIterationId)) {
			return;
		}
		if (ret.isValid === false) {
			isAllValid = false;
		}

		// Identify reactive and lazy validators separately because they are run concurrently.
		ret.id = processedValidator.validatorId;

		// Check if this validation result already exists.
		// Replace it if it does, otherwise add it.
		const existingResult = propertyConfig.validationResults.value.find((x) => x.id === ret.id);
		if (existingResult !== undefined) {
			Object.assign(existingResult, ret);
			if (
				ret.name !== undefined &&
				propertyConfig.namedValidationResults.value[ret.name] !== undefined
			) {
				Object.assign(
					propertyConfig.namedValidationResults.value[ret.name],
					ret,
				);
			}
		} else {
			propertyConfig.validationResults.value.push(ret);
			if (ret.name !== undefined) {
				propertyConfig.namedValidationResults.value[ret.name] = ret;
			}
		}
	};

	// Collect all the promised results in a list to return
	const promises: Promise<(BaseValidationReturn | undefined)[]>[] = [];

	// Schedule all the validators to run in their own promise.
	// If a given processed validator already has validation running, wait for it to finish before validating it again.
	// This avoids most race conditions with modifying state for a given validation config.
	for (const processedValidator of validators) {
		const promiseToValidate = (processedValidator.activeValidation ?? Promise.resolve()).then(async () => {
			if (iterationId !== toValue(currentIterationId)) {
				// Skip validation it isn't the latest iteration
				// This massively improves throughput for validation that takes awhile to perform.
				return [];
			}
			return await executeAndOptimize(processedValidator, true);
		});
		processedValidator.activeValidation = promiseToValidate;
		promises.push(promiseToValidate);
	}

	await Promise.all(promises);
	return isAllValid;

	// Nested functions are pretty gross, but useful for not passing around the same arguments recursively.
	/**
	 * Handles the invocation and responses of nested validators. Recursively calls itself if validators return more validators.
	 * @param validators The list of validators to invoke
	 * @param originProcessedValidator The processed validator that started the chain of recursion. Necessary for tracking which validators spawned from it, so they can be deleted in the future.
	 */
	function recursiveInvokeValidators(
		validators: ProcessedValidator[],
		originProcessedValidator: ProcessedValidator,
	) {
		// Collect all the promised results in a list to return
		const promises: Promise<(BaseValidationReturn | undefined)[]>[] = [];

		for (const processedValidator of validators) {
			promises.push(executeAndOptimize(processedValidator, false, originProcessedValidator));
		}

		return promises;
	}

	/** Encapsulates the logic for executing a {@link ProcessedValidator}. */
	async function executeAndOptimize(
		processedValidator: ProcessedValidator,
		shouldOptimize: boolean,
		originProcessedValidator: ProcessedValidator = processedValidator,
	) {
		const results: (BaseValidationReturn | undefined)[] = [];
		const checkForValidatorReturn = processedValidator.previouslyReturnedValidators;
		if (checkForValidatorReturn) {
			processedValidator.previouslySpawnedValidators = processedValidator.spawnedValidators;
			// This will be set later on if this validator does return validators again.
			processedValidator.spawnedValidators = {};
		}
		processedValidator.previouslyReturnedValidators = false;

		const params: GenericValidatorParams = {
			value: propertyConfig.target.value,
			model: model,
			args: args,
			arrayAncestors: propertyConfig.arrayAncestors,
		};

		// Invoke the validator
		const validationReturn: ReturnType<GenericValidator> = processedValidator.validator(params);

		if (validationReturn instanceof Promise) {
			// Check how long this async validator takes to return.
			const ret = await validationReturn;

			// Check if this validator returned validators
			if (Array.isArray(ret)) {
				const returnedValidatorResponses = handleReturnedValidators(
					processedValidator,
					ret,
					originProcessedValidator,
				);
				// This contains all nested validation results, no matter how deeply nested they were.
				const nestedResults = await Promise.all(returnedValidatorResponses);
				results.push(...nestedResults.flat());
				if (checkForValidatorReturn) {
					removeOldNestedValidators(propertyConfig, processedValidator);
				}
			} else {
				if (checkForValidatorReturn) {
					removeOldNestedValidators(propertyConfig, processedValidator);
				}
				if (ret != undefined) {
					results.push(ret);
					resultProcessor(propertyConfig, processedValidator, ret);
				}
			}
		} else if (Array.isArray(validationReturn)) {
			// Assume the array is full of validators. TypeScript should warn them from returning any other type of array.
			// We can't optimize these validators because they might not come back in subsequent runs.
			// So if async calls are returned in this array they will NOT be throttled.
			// This is because the list of validators returned COULD be dynamic, although it's very unlikely.
			// It's impossible to know which validator is a previously ran validator because there's no ID attached to the function.
			const returnedValidatorResponses = handleReturnedValidators(
				processedValidator,
				validationReturn,
				originProcessedValidator,
			);
			const nestedResults = await Promise.all(returnedValidatorResponses);
			results.push(...nestedResults.flat());
			if (checkForValidatorReturn) {
				removeOldNestedValidators(propertyConfig, processedValidator);
			}
		} else {
			if (checkForValidatorReturn) {
				removeOldNestedValidators(propertyConfig, processedValidator);
			}
			if (validationReturn != undefined) {
				// Determine if we should optimize this sync validator
				if (shouldOptimize && processedValidator.optimized === false) {
					// strongly type the processed validator as a SyncValidator.
					const typedValidator = processedValidator
						.validator as GenericSyncValidator;
					// Optimize sync validators into computed functions
					const computedValidator = computed<
						ReturnType<typeof typedValidator>
					>(() => {
						// TODO: Write a test for checking if an optimized sync validator will detect changes to model or args.
						// Obviously changes to array ancestors completely changes the structure of validation, and that can't be expected to be reactive.
						const params: GenericValidatorParams = {
							value: propertyConfig.target.value, // Setup a reactive dependency on the property value
							model: model,
							args: args,
							arrayAncestors: propertyConfig.arrayAncestors,
						};
						return typedValidator(params);
					});
					// Prevent future optimizations on this processed validator
					processedValidator.optimized = true;
					// Replace a validator with a function that just gets the value of the computed.
					processedValidator.validator = () => computedValidator.value;
				}
				results.push(validationReturn);
				resultProcessor(
					propertyConfig,
					processedValidator,
					validationReturn,
				);
			}
		}
		return results;
	}

	function handleReturnedValidators(
		parentProcessedValidator: ProcessedValidator,
		returnedValidators: GenericValidator[],
		originProcessedValidator: ProcessedValidator,
	) {
		// Turn them into processed validators so they can be
		// executed the same way all other validators are
		const processedRetValidators = processValidators(
			returnedValidators,
			parentProcessedValidator.isReactive,
			parentProcessedValidator.validatorId,
		);
		const response = recursiveInvokeValidators(
			processedRetValidators,
			originProcessedValidator, // don't optimize
		);

		// Create the spawned validators map for the parentProcessedValidator
		// TODO: If a validator returned from a validator also returns more validators,
		// it's likely it won't properly remove its error messages because it doesn't modify the spawned validators.
		const spawnedValidatorsMap: ProcessedValidator["spawnedValidators"] = originProcessedValidator.spawnedValidators;
		for (const processedValidator of processedRetValidators) {
			if (spawnedValidatorsMap[processedValidator.validatorId] != undefined) {
				// The unique ID of validators is not actually unique and that's a serious problem.
				console.error(
					`Unable to keep track of nested validators. Validator ID: ${processedValidator.validatorId} was not unique.`,
				);
			}
			spawnedValidatorsMap[processedValidator.validatorId] = processedValidator;
		}
		parentProcessedValidator.spawnedValidators = spawnedValidatorsMap;
		parentProcessedValidator.previouslyReturnedValidators = true;

		return response;
	}
}

/**
 * Private function which removes the results of previously spawned validators that are no longer apart of the spawned validators map.
 * @param propertyConfig
 * @param processedValidator
 */
function removeOldNestedValidators(
	propertyConfig: PropertyValidationConfig,
	processedValidator: ProcessedValidator,
) {
	for (
		const validatorId in processedValidator.previouslySpawnedValidators
	) {
		if (processedValidator.spawnedValidators[validatorId] != undefined) {
			continue;
		}
		const index = propertyConfig.validationResults.value.findIndex((x) => x.id === validatorId);
		if (index !== -1) {
			propertyConfig.validationResults.value.splice(index, 1);
		}
	}
}

/**
 * Invokes all reactive validators for a property and returns whether or not they all passed.
 * @param propertyConfig the property config we're validating for
 * @param model the entire model given to the composable
 * @param args the additional arguments to pass to validators
 * @param iterationId this iteration id
 * @param currentIterationId getter for the latest iteration id
 */
export async function invokeReactivePropertyValidators(
	propertyConfig: PropertyValidationConfig,
	model: unknown,
	args: unknown,
	/** Must match latest iteration ID on property config before updating any state. */
	iterationId: number,
	currentIterationId: MaybeRefOrGetter<number>,
): Promise<boolean> {
	propertyConfig.isValidatingReactive.value = true;

	// Get the specified reactive validators and run them.
	const isAllValid = await invokeAndOptimizeValidators(
		propertyConfig,
		model,
		args,
		iterationId,
		currentIterationId,
		propertyConfig.reactiveProcessedValidators,
	);

	// Only update the validation config if this is the latest validation iteration
	if (iterationId === toValue(currentIterationId)) {
		propertyConfig.isReactiveValid.value = isAllValid;
		propertyConfig.isValidatingReactive.value = false;
	}

	return propertyConfig.isReactiveValid.value ?? false;
}

/**
 * Invokes all lazy validators for a property and returns whether or not they all passed.
 * @param propertyConfig the property config we're validating for
 * @param model the entire model given to the composable
 * @param args the additional arguments to pass to validators
 * @param iterationId this iteration id
 * @param currentIterationId getter for the latest iteration id
 */
export async function invokeLazyPropertyValidators(
	propertyConfig: PropertyValidationConfig,
	model: unknown,
	args: unknown,
	/** Must match latest iteration ID on property config before updating any state. */
	iterationId: number,
	currentIterationId: MaybeRefOrGetter<number>,
): Promise<boolean> {
	propertyConfig.isValidatingLazy.value = true;

	// Get the specified lazy validators and run them.
	const isAllValid = await invokeAndOptimizeValidators(
		propertyConfig,
		model,
		args,
		iterationId,
		currentIterationId,
		propertyConfig.lazyProcessedValidators,
	);

	// Only update the validation config if this is the latest validation iteration
	if (iterationId === toValue(currentIterationId)) {
		propertyConfig.isLazyValid.value = isAllValid;
		propertyConfig.isValidatingLazy.value = false;
	}

	return propertyConfig.isLazyValid.value ?? false;
}

/**
 * The starting point of the validation process, after the validators have been processed into validator configs.
 *
 * Invoke either or both types of validators from the validation configs provided.
 * @param validationConfigs the validation configs to invoke validators from
 * @param model the entire model given to the composable
 * @param args the argument object to be passed into the "args" parameter of the validators.
 * @param reactive invoke reactive validators
 * @param lazy invoke lazy validators
 */
export function invokeValidatorConfigs(
	validationConfigs: PropertyValidationConfig[],
	model: Ref<unknown>,
	args: unknown,
	reactive: boolean,
	lazy: boolean,
): Promise<boolean> {
	const validatorPromises: Promise<boolean>[] = [];
	for (const validationConfig of validationConfigs) {
		if (reactive && validationConfig.reactiveProcessedValidators.length > 0) {
			validatorPromises.push(invokeReactivePropertyValidators(
				validationConfig,
				model.value,
				args,
				++validationConfig.reactiveIterationId,
				() => validationConfig.reactiveIterationId,
			));
		}

		if (lazy && validationConfig.lazyProcessedValidators.length > 0) {
			validatorPromises.push(invokeLazyPropertyValidators(
				validationConfig,
				model.value,
				args,
				++validationConfig.lazyIterationId,
				() => validationConfig.lazyIterationId,
			));
		}

		// Check if there are array elements to validate. Each element can have its own lazy or reactive properties.
		// This check on $arrayState is EXTREMELY important for making sure $arrayState is invoked at least once
		if (Array.isArray(validationConfig.validationState.$arrayState)) {
			const elementValidationConfigs: PropertyValidationConfig[] = [];
			for (const key in validationConfig.arrayConfigMap) {
				elementValidationConfigs.push(
					...validationConfig.arrayConfigMap[key].validationConfigs,
				);
			}
			validatorPromises.push(
				invokeValidatorConfigs(
					elementValidationConfigs,
					model,
					args,
					reactive,
					lazy,
				),
			);
		}
	}
	// Return true if all promises returned true, otherwise false.
	return Promise.all(validatorPromises).then((response) => response.every((x) => x === true));
}
