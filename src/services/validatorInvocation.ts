import { BaseValidationReturn, Validator } from "../../dist";
import { throttleQueueAsync } from "../finalFormUtilities";
import { ProcessedValidator } from "../privateTypes";
import { processValidators } from "./validatorProcessing";

type ThenCallback<G, KParent, Args, FValidationReturn> = (
	processedValidator: ProcessedValidator<G, KParent, Args, FValidationReturn>,
	ret: BaseValidationReturn<any>
) => any;

/** 
 * Handles invoking and optimization of the provided list of validators. 
 */
export function invokeAndOptimizeValidators<
	G, 
	KParent,
	Args,
	FValidationReturn
>(
	property: G,
	parent: KParent | null | undefined,
	args: Args,
	latestProcessedValidators: ProcessedValidator<G, KParent, Args, FValidationReturn>[] = [],
	/** The callback function for handling resolved validation promises */
	thenCallback: ThenCallback<G, KParent, Args, FValidationReturn>,
	shouldOptimize: boolean = true,
	recursionCount: number = 1
) {
	// Collect all the promised results and synchronous results in lists to return later.
	const allPromises: Promise<BaseValidationReturn>[] = [];
	const allResults: BaseValidationReturn<any>[] = [];
	const validatorsWhichReturnedValidators: ProcessedValidator<G, KParent, Args, FValidationReturn>[] = [];

	for (const processedValidator of latestProcessedValidators) {
		const shouldOptimizeValidator = !processedValidator.optimized;
		if (processedValidator.previouslyReturnedValidators) {
			// Add this validator to a list to make it simpler to loop over
			// the validators that may have error messages displaying from the previous run.
			validatorsWhichReturnedValidators.push(processedValidator);
		}
		processedValidator.previouslyReturnedValidators = false;
		const validationReturn = processedValidator.validator({
			value: property,
			parent: parent,
			args: args
		});
		if (validationReturn instanceof Promise) {
			allPromises.push(
				validationReturn.then(ret => {
					if (ret === undefined) {
						return undefined;
					}
					if (Array.isArray(ret)) {
						const { asyncPromises, syncResults } = handleReturnedValidators(
							property,
							parent,
							args,
							thenCallback,
							processedValidator,
							ret,
							recursionCount
						);
						allPromises.push(...asyncPromises);
						allResults.push(...syncResults);
						return;
					}
					thenCallback(processedValidator, ret);
				})
			);
			if (shouldOptimize && shouldOptimizeValidator) {
				processedValidator.optimized = true;
				// Optimize async requests by adding a throttle to them.
				processedValidator.validator = throttleQueueAsync<
						typeof processedValidator.validator,
						Awaited<ReturnType<typeof processedValidator.validator>>
					>(processedValidator.validator, 500);
			}
		}
		else if (Array.isArray(validationReturn)) {
			// Assume the array is full of validators. TypeScript should warn them from returning any other type of array.
			// We can't optimize these validators because we're not keeping track of them for subsequent runs.
			// So if async calls are returned in this array they will NOT be throttled.
			// This is because the list of validators returned COULD be dynamic, although it's very unlikely.
			// It's impossible to know which validator is a previously ran validator because there's no ID attached to the function.
			const { asyncPromises, syncResults } = handleReturnedValidators(
				property,
				parent,
				args,
				thenCallback,
				processedValidator,
				validationReturn,
				recursionCount
			);
			allPromises.push(...asyncPromises);
			allResults.push(...syncResults);
		}
		else {
			// This check was added to support returning an array of promises for the validateIf() validator.
			if (validationReturn !== undefined) {
				allResults.push(validationReturn);
				thenCallback(processedValidator, validationReturn);
			}
		}
	}
	return {
		syncResults: allResults,
		/** The promised results from the async validators */
		asyncPromises: allPromises,
		validatorsWhichReturnedValidators
	};
}

/** Takes the array of validators returned from a validator and adds them to the normal validation process. */
function handleReturnedValidators<
	G, 
	KParent,
	Args,
	FValidationReturn
>(
	property: G,
	parent: KParent | null | undefined,
	args: Args,
	/** The callback function for handling resolved validation promises */
	thenCallback: ThenCallback<G, KParent, Args, FValidationReturn>,
	parentProcessedValidator: ProcessedValidator<G, KParent, Args, FValidationReturn>,
	ret: Validator<G, KParent, Args, FValidationReturn>[],
	recursionCount: number
) {
	// Process the returned validators
	const processedRetValidators = processValidators(
		ret,
		parentProcessedValidator.isReactive,
		parentProcessedValidator.validatorId
	);
	// Enable support for returning a list of validators to run after a validator was ran.
	// This feature was added for the validateIf() validator to handle async validators asynchronously from the synchronous validators.
	const { asyncPromises, optimizedValidators: nestedValidators, syncResults } = invokeAndOptimizeValidators(
		property,
		parent,
		args,
		processedRetValidators,
		thenCallback,
		false,
		++recursionCount
	);

	const spawnedValidatorsMap: ProcessedValidator<G, KParent, Args, FValidationReturn>["spawnedValidators"] = {}
	for (const processedValidator of nestedValidators) {
		spawnedValidatorsMap[processedValidator.validatorId] = processedValidator;
	}
	parentProcessedValidator.spawnedValidators = spawnedValidatorsMap;
	parentProcessedValidator.previouslyReturnedValidators = true;

	return {
		asyncPromises,
		syncResults,
		optimizedValidators: nestedValidators
	};
}