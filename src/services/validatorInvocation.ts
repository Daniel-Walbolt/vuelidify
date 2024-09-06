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
	shouldOptimize: boolean = true
) {
	// Collect all the promised results and synchronous results in lists to return later.
	const allPromises: Promise<BaseValidationReturn>[] = [];
	const allResults: BaseValidationReturn<any>[] = [];
	// Prepare a new array of the processed validators to return.
	// If optimizations are made to the validator, they will be put into new objects.
	const optimizedValidators: ProcessedValidator<G, KParent, Args, FValidationReturn>[] = [];

	for (const processedValidator of latestProcessedValidators) {
		const shouldOptimizeValidator = !processedValidator.optimized;
		if (processedValidator.optimized) {
			console.log("Validator already optimized.");
		}
		let validator = processedValidator.validator;
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
						const { asyncPromises, optimizedValidators, syncResults } = handleReturnedValidators(
							property,
							parent,
							args,
							thenCallback,
							processedValidator,
							ret
						);
						allPromises.push(...asyncPromises);
						allResults.push(...syncResults);
						optimizedValidators.push(...optimizedValidators);
						return;
					}
					thenCallback(processedValidator, ret);
				})
			);
			if (shouldOptimize && shouldOptimizeValidator) {
				console.log("Optimizing validator");
				// Optimize async requests by adding a throttle to them.
				validator = throttleQueueAsync<typeof validator, Awaited<ReturnType<typeof validator>>>(validator, 500);
			}
		}
		else if (Array.isArray(validationReturn)) {
			// Assume the array is full of validators. TypeScript should warn them from returning any other type of array.
			// We can't optimize these validators because we're not keeping track of them for subsequent runs.
			// So if async calls are returned in this array they will NOT be throttled.
			// This is because the list of validators returned COULD be dynamic, although it's very unlikely.
			// It's impossible to know which validator is a previously ran validator because there's no ID attached to the function.
			const { asyncPromises, optimizedValidators, syncResults } = handleReturnedValidators(
				property,
				parent,
				args,
				thenCallback,
				processedValidator,
				validationReturn
			);
			allPromises.push(...asyncPromises);
			allResults.push(...syncResults);
			optimizedValidators.push(...optimizedValidators);
		}
		else {
			// This check was added to support returning an array of promises for the validateIf() validator.
			if (validationReturn !== undefined) {
				allResults.push(validationReturn);
				thenCallback(processedValidator, validationReturn);
			}
		}
		optimizedValidators.push({
			...processedValidator,
			validator: validator,
			optimized: true
		});
	}
	return {
		syncResults: allResults,
		/** The promised results from the async validators */
		asyncPromises: allPromises,
		/** The updated processed validator objects */
		optimizedValidators: optimizedValidators
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
	ret: Validator<G, KParent, Args, FValidationReturn>[]
) {
	// Process the returned validators
	const processedRetValidators = processValidators(ret, parentProcessedValidator.isReactive);
	// Enable support for returning a list of validators to run after a validator was ran.
	// This feature was added for the validateIf() validator to handle async validators asynchronously from the synchronous validators.
	const { asyncPromises, optimizedValidators, syncResults } = invokeAndOptimizeValidators(
		property,
		parent,
		args,
		processedRetValidators,
		thenCallback,
		false
	);
	return {
		asyncPromises,
		syncResults,
		optimizedValidators
	};
}