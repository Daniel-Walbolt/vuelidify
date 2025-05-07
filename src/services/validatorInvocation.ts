import { computed, MaybeRefOrGetter, toValue, type Ref } from 'vue';
import { bufferAsync, throttleQueueAsync } from '../throttleFunctions.ts';
import type { GenericSyncValidator, GenericValidator, GenericValidatorParams, ProcessedValidator, PropertyValidationConfig } from '../privateTypes.ts';
import { processValidators } from './validatorProcessing.ts';
import type { BaseValidationReturn } from '../publicTypes.ts';

type ResultProcessor = (
	/** The validation config whose result is being processed */
	propertyConfig: PropertyValidationConfig,
	processedValidator: ProcessedValidator,
	ret: BaseValidationReturn<unknown>
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
	validators: ProcessedValidator[]
) {
	let isAllValid = true;
	
	// Create a callback to process the result of each validator.
	const resultProcessor: ResultProcessor = (
		propertyConfig: PropertyValidationConfig,
		processedValidator: ProcessedValidator,
		ret: BaseValidationReturn<unknown>
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
		const existingResult = propertyConfig.validationResults.value.find(x => x.id === ret.id);
		if (existingResult !== undefined) {
			// TODO: This might cause a problem with reactivity
			Object.assign(existingResult, ret);
			if (ret.name !== undefined && propertyConfig.namedValidationResults.value[ret.name] !== undefined) {
				Object.assign(propertyConfig.namedValidationResults.value[ret.name], ret);
			}
		} else {
			propertyConfig.validationResults.value.push(ret);
			if (ret.name !== undefined) {
				propertyConfig.namedValidationResults.value[ret.name] = ret;
			}
		}
	};

	const { asyncPromises, validatorsWhichPreviouslyReturnedValidators} = recursiveInvokeAndOptimizeValidators(
		propertyConfig,
		model,
		args,
		iterationId,
		validators,
		resultProcessor,
		true,
		1
	);
	await Promise.all(asyncPromises);
	
	if (iterationId === toValue(currentIterationId)) {
		// Remove the error messages of validators that were ran in the previous run but not in this run.
		for (const processedValidator of validatorsWhichPreviouslyReturnedValidators) {
			for (const validatorId of Object.keys(processedValidator.previouslySpawnedValidators)) {
				if (processedValidator.spawnedValidators[validatorId] == undefined) {
					const index = propertyConfig.validationResults.value.findIndex(x => x.id === validatorId);
					if (index !== -1) {
						propertyConfig.validationResults.value.splice(index);
					}
				}
			}
		}
	}
	return isAllValid;
}

/**
 * Private function that has extra parameters for recursive calls
 * @param propertyConfig the config we're validating for
 * @param model the entire model given to the composable
 * @param args the additional arguments to pass to validators
 * @param iterationId this iteration's ID
 * @param validators the list of validators to invoke and optimize
 * @param processValidatorResult callback which processes the return values of validators
 * @param shouldOptimize whether or not to optimize validators
 * @param recursionCount counter for the amount of recursion happening.
 */
function recursiveInvokeAndOptimizeValidators(
	propertyConfig: PropertyValidationConfig,
	model: unknown,
	args: unknown,
	iterationId: number,
	validators: ProcessedValidator[],
	processValidatorResult: ResultProcessor,
	shouldOptimize: boolean,
	recursionCount: number
) {
	const property = propertyConfig.target.value;
	// Collect all the promised results and synchronous results in lists to return later.
	const allPromises: Promise<BaseValidationReturn | undefined>[] = [];
	const allResults: BaseValidationReturn<unknown>[] = [];
	// Add validators to this list that returned validators from a previous run, but did not this time.
	const validatorsWhichPreviouslyReturnedValidators: ProcessedValidator[] = [];
	for (const processedValidator of validators) {
		let checkForValidatorReturn = false;
		if (processedValidator.previouslyReturnedValidators) {
			processedValidator.previouslySpawnedValidators = processedValidator.spawnedValidators;
			processedValidator.spawnedValidators = {}; // This will be set later on if this validator does return validators again.
			checkForValidatorReturn = true;
		}
		processedValidator.previouslyReturnedValidators = false;

		let validationReturn: ReturnType<GenericValidator>;
		if (processedValidator.computedValidator === undefined) {
			// The type the user sees will be conditional and correct, but in this code it needs to account for all cases.
			// This will require a cast to the type the validator expects in order to avoid type errors.
			const params: GenericValidatorParams = {
				value: property,
				model: model,
				args: args,
				arrayAncestors: propertyConfig.arrayAncestors
			};
			validationReturn = processedValidator.validator(params);
		} else {
			validationReturn = processedValidator.computedValidator.value as typeof validationReturn;
		}

		if (validationReturn instanceof Promise) {
			// Check how long this async validator takes to return.
			const past = Date.now();
			allPromises.push(
				validationReturn.then(async ret => {
					if (ret === undefined) {
						if (checkForValidatorReturn) {
							validatorsWhichPreviouslyReturnedValidators.push(processedValidator);
						}
						return undefined;
					}
					const duration = Date.now() - past;

					// Optionally optimize async validator
					if (shouldOptimize && duration > ThrottleDurationMs && processedValidator.optimized === false) {
						processedValidator.optimized = true;
						if (duration > ThrottleDurationMs && duration < 2 * ThrottleDurationMs) {
							// Moderately slow validators will receive a throttle.
							// Calls will overlap, but it shouldn't overwhelm the server
							processedValidator.validator = throttleQueueAsync<
									typeof processedValidator.validator,
									Awaited<ReturnType<typeof processedValidator.validator>>
								>(processedValidator.validator, ThrottleDurationMs);
						} else {
							// Slow validators will receive a buffer.
							// Calls will never overlap
							processedValidator.validator = bufferAsync<
									typeof processedValidator.validator,
									Awaited<ReturnType<typeof processedValidator.validator>>
								>(processedValidator.validator);
						}
					}

					// Check if this validator returned validators
					if (Array.isArray(ret)) {
						const { asyncPromises, syncResults } = handleReturnedValidators(
							propertyConfig,
							model,
							args,
							iterationId,
							processValidatorResult,
							processedValidator,
							ret,
							recursionCount
						);
						allResults.push(...syncResults);
						await Promise.all(asyncPromises); // Wait for all spawned validators to finish
						return;
					} else if (checkForValidatorReturn) {
						validatorsWhichPreviouslyReturnedValidators.push(processedValidator);
					}
					processValidatorResult(propertyConfig, processedValidator, ret);
				})
			);
		} else if (Array.isArray(validationReturn)) {
			// Assume the array is full of validators. TypeScript should warn them from returning any other type of array.
			// We can't optimize these validators because they might not come back in subsequent runs.
			// So if async calls are returned in this array they will NOT be throttled.
			// This is because the list of validators returned COULD be dynamic, although it's very unlikely.
			// It's impossible to know which validator is a previously ran validator because there's no ID attached to the function.
			const { asyncPromises, syncResults } = handleReturnedValidators(
				propertyConfig,
				model,
				args,
				iterationId,
				processValidatorResult,
				processedValidator,
				validationReturn,
				recursionCount
			);
			allPromises.push(...asyncPromises);
			allResults.push(...syncResults);
		} else {
			if (checkForValidatorReturn) {
				validatorsWhichPreviouslyReturnedValidators.push(processedValidator);
			}
			if (validationReturn !== undefined) {
				if (shouldOptimize && processedValidator.optimized === false) {
					const typedValidator = processedValidator.validator as GenericSyncValidator;
					// Optimize sync validators into computed functions
					processedValidator.computedValidator = computed<ReturnType<typeof typedValidator>>(() => {
						const params: GenericValidatorParams = {
							value: propertyConfig.target.value, // Setup a reactive dependency on the property value
							model: model,
							args: args,
							arrayAncestors: propertyConfig.arrayAncestors
						};
						return typedValidator(params);
					});
					processedValidator.optimized = true;
					// Replace a validator with a function that just gets the value of the computed.
					processedValidator.validator = (() => processedValidator.computedValidator?.value);
				}
				allResults.push(validationReturn);
				processValidatorResult(propertyConfig, processedValidator, validationReturn);
			}
		}
	}

	return {
		asyncPromises: allPromises,
		syncResults: allResults,
		validatorsWhichPreviouslyReturnedValidators
	};
}

/**
 * Takes the array of validators returned from a validator and adds them to the normal validation process.
 * @param propertyConfig the config we're validating for
 * @param model the entire model given to the composable
 * @param args the additional arguments to pass to validators
 * @param iterationId this iteration's ID
 * @param validators the list of validators to invoke and optimize
 * @param processValidatorResult callback which processes the return values of validators
 * @param recursionCount counter for the amount of recursion happening.
 * @param parentProcessedValidator the validator which spawned the returnedValidators
 * @param returnedValidators validators which were returned from invoking a validator
 */
function handleReturnedValidators(
	propertyConfig: PropertyValidationConfig,
	model: unknown,
	args: unknown,
	/** Must match latest iteration ID on property config before updating any state. */
	iterationId: number,
	processValidatorResult: ResultProcessor,
	parentProcessedValidator: ProcessedValidator,
	returnedValidators: GenericValidator[],
	recursionCount: number
) {
	const processedRetValidators = processValidators(
		returnedValidators,
		parentProcessedValidator.isReactive,
		parentProcessedValidator.validatorId
	);
	const response = recursiveInvokeAndOptimizeValidators(
		propertyConfig,
		model,
		args,
		iterationId,
		processedRetValidators,
		processValidatorResult,
		false,
		++recursionCount
	);

	const spawnedValidatorsMap: ProcessedValidator['spawnedValidators'] = {};
	for (const processedValidator of processedRetValidators) {
		spawnedValidatorsMap[processedValidator.validatorId] = processedValidator;
	}
	parentProcessedValidator.spawnedValidators = spawnedValidatorsMap;
	parentProcessedValidator.previouslyReturnedValidators = true;

	return response;
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
	currentIterationId: MaybeRefOrGetter<number>
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
	currentIterationId: MaybeRefOrGetter<number>
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
	lazy: boolean
): Promise<boolean> {
	const validatorPromises: Promise<boolean>[] = [];
	for (const validationConfig of validationConfigs) {
		if (reactive && validationConfig.reactiveProcessedValidators.length > 0) {
			validatorPromises.push(invokeReactivePropertyValidators(
				validationConfig,
				model.value,
				args,
				++validationConfig.reactiveIterationId,
				() => validationConfig.reactiveIterationId
			));
		}

		if (lazy && validationConfig.lazyProcessedValidators.length > 0) {
			validatorPromises.push(invokeLazyPropertyValidators(
				validationConfig,
				model.value,
				args,
				++validationConfig.lazyIterationId,
				() => validationConfig.lazyIterationId
			));
		}
		
		// Check if there are array elements to validate. Each element can have its own lazy or reactive properties.
		// This check on $arrayState is EXTREMELY important for making sure $arrayState is invoked at least once
		if (Array.isArray(validationConfig.validationState.$arrayState)) {
			const elementValidationConfigs: PropertyValidationConfig[] = [];
			for (const key in validationConfig.arrayConfigMap) {
				elementValidationConfigs.push(...validationConfig.arrayConfigMap[key].validationConfigs);
			}
			validatorPromises.push(invokeValidatorConfigs(elementValidationConfigs, model, args, reactive, lazy));
		}
	}
	// Return true if all promises returned true, otherwise false.
	return Promise.all(validatorPromises).then(response => response.every(x => x === true));
}