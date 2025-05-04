import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ref } from "vue";
import { useValidation } from "../src/useValidation.ts";
import { must } from "../src/validators.ts";
import { pause } from "./main.ts";

Deno.test("Simple Object Validation", async (test: Deno.TestContext) => {
	await test.step("Must Validator", testMustEqualValidator);
	await test.step("Test nullable object validation", testNullableObjectValidation);
});

type SimpleObject = {
	age?: number;
	name?: string;
	password?: string;
	relatedEntity?: {
		confirmPassword?: string;
	} | null;
};

const testMustEqualValidator = async (test: Deno.TestContext) => {
	const model = ref<SimpleObject>({
		password: "",
		relatedEntity: {}
	});
	const v$ = useValidation({
		model: model,
		validation: {
			password: {
				$reactive: [
					must(p => p.value === p.parent.relatedEntity?.confirmPassword, "Passwords do not match")
				]
			},
		},
		delayReactiveValidation: false
	});
	model.value.password = "Test";
	await pause();
	assert(v$.isValid === false, "isValid was true when the passwords do not match (confirm password is undefined)");
	if (model.value.relatedEntity == undefined) {
		model.value.relatedEntity = {};
	}
	model.value.relatedEntity.confirmPassword = "Test";
	await pause();
	assert(v$.isValid === true, "isValid was false when the passwords are matching");
};

const testNullableObjectValidation = async (test: Deno.TestContext) => {
	const model = ref<SimpleObject>({
		age: 10,
		name: "Foo"
	});
	const v$ = useValidation({
		model: model,
		validation: {
			relatedEntity: {
				$reactive: [
					must(p => p.value != undefined, "Related entity must be defined")
				]
			}
		},
		delayReactiveValidation: false
	});
	await v$.validate();
	assert(v$.state.relatedEntity?.$state != undefined, "$state was not defined for a nested object that has validation rules defined for it");
	assert(v$.state.relatedEntity?.$state?.isValid === false, "Validation on undefined nested object passed when it should have failed.");
	model.value.relatedEntity = null;
	await pause();
	assert(v$.state.relatedEntity?.$state?.isValid === false, "Validation on null nested object passed when it should have failed.");
	model.value.relatedEntity = {};
	await pause();
	assert(v$.state.relatedEntity?.$state?.isValid === true, "Validation on nested object failed when it should have passed");
};