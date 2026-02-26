import type { ValidationConfig, ValidationState } from "./publicTypes.ts";
import {
	computed,
	type ComputedRef,
	type Reactive,
	reactive,
	type Ref,
	ref,
	type ShallowRef,
	shallowRef,
	watch,
} from "vue";
import type { GenericValidation, PropertyValidationConfig } from "./privateTypes.ts";
import { invokeValidatorConfigs } from "./services/validatorInvocation.ts";
import { setupValidation } from "./services/validatorProcessing.ts";

export type UseValidationReturn<
	T = unknown,
	Return = any,
> = {
	hasValidated: Ref<boolean>;
	validate: () => Promise<boolean>;
	isValidating: ComputedRef<boolean>;
	/** Stores the results of validation */
	state: ComputedRef<ValidationState<T, Return>>;
	/** True only if all validators passed. */
	isValid: ComputedRef<boolean>;
	/** True if any of the validators failed. */
	isErrored: ComputedRef<boolean>;
	/** Sets the internal reference object for determining {@link isDirty} */
	setReference: (reference: T) => void;
	/**
	 * Reactively determines if the object being validated has changed from the reference state.
	 *
	 * The reference state can be changed using {@link setReference()}.
	 */
	isDirty: ComputedRef<boolean>;
	/**
	 * Resets the internal state of the composable back to its starting state.
	 */
	reset: () => void;
};

/**
 * The starting point for validation with Vuelidify.
 *
 * @author Daniel Walbolt
 */
export function useValidation<
	T,
	Args = unknown,
	Return = any,
>(
	validationConfig: ValidationConfig<T, Args, Return>,
): Reactive<UseValidationReturn<T, Return>> {
	validationConfig.delayReactiveValidation ??= true; // Default value for delayReactiveValidation
	const { model: object, validation, delayReactiveValidation, args } = validationConfig;

	/** Only true after {@link validate()} finished successfully. */
	const hasValidated = ref(false);
	const isValidating = computed(() =>
		validationConfigs.value.some((x) => x.isValidatingLazy.value || x.isValidatingReactive.value)
	);
	const isErrored = computed(() =>
		validationConfigs.value.some((x) => x.validationResults.value.some((x) => x.isValid === false))
	);
	const isValid = computed(() => {
		const allValidatorsValid = validationConfigs.value.every((x) => x.isReactiveValid.value && x.isLazyValid.value);
		return allValidatorsValid;
	});

	/** The reference for determining if the object has been changed or not.  */
	const dirtyReference = ref(JSON.stringify(validationConfig.model.value));
	const isDirty = computed(() => dirtyReference.value !== JSON.stringify(validationConfig.model.value));

	let setup: ReturnType<typeof setupValidation> = setupValidation(
		object as Ref<T>,
		validation as GenericValidation,
	);
	const validationState: Ref<ValidationState<T, Return>> = shallowRef(setup.state as ValidationState<T, Return>);
	/** List of objects that relates validation to the object's properties. */
	const validationConfigs: ShallowRef<PropertyValidationConfig[]> = shallowRef(setup.validationConfigs);

	/**
	 * Watch the object for any changes.
	 * This is the alternative to watching every property individually.
	 * This may be more costly on performance, but does allow for property inter-dependence.
	 * Editing one property will invoke the reactive validators of every other and itself.
	 */
	watch(
		validationConfig.model,
		() => {
			if (delayReactiveValidation) {
				if (hasValidated.value === true) {
					invokeValidatorConfigs(validationConfigs.value, object, args, true, false);
				}
			} else {
				invokeValidatorConfigs(validationConfigs.value, object, args, true, false);
			}
		},
		{ deep: true },
	);

	/** Invokes all reactive and lazy validators. Returns whether or not all validators passed.*/
	async function validate() {
		const isValid = await invokeValidatorConfigs(
			validationConfigs.value,
			object,
			args,
			true,
			true,
		);
		hasValidated.value = true;
		return isValid;
	}

	/** Change the reference object to compare the current object state against. The reference is used to determine dirty state. */
	function setReference(reference: T) {
		dirtyReference.value = JSON.stringify(reference);
	}

	/** Sets the internal state of the composable back to its starting state. */
	function reset() {
		hasValidated.value = false;
		setup = setupValidation(
			object as Ref<T>,
			validation as GenericValidation,
		);
		validationConfigs.value = setup.validationConfigs;
		validationState.value = setup.state as ValidationState<T, Return>;
	}

	return reactive({
		hasValidated,
		validate,
		isValidating,
		state: computed(() => validationState.value),
		isValid,
		isErrored,
		setReference,
		isDirty,
		reset,
	});
}
