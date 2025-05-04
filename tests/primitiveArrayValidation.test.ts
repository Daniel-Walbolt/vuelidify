Deno.test("Test Array Validation", async (test: Deno.TestContext) => {
	await test.step("Primitive Array Validation", testPrimitiveArrayValidation);
	await test.step("Basic Object Array Validation", testObjectArrayValidation);
	await test.step("Array parent parameter", testArrayParentParameter);
	await test.step("Array parent index parameter", testArrayIndexParameter);
	await test.step("Deeply nested arrays", testDeeplyNestedArrayValidation);
});

const testPrimitiveArrayValidation = async (test: Deno.TestContext) => {

};

/** For testing if basic object array validation works */
const testObjectArrayValidation = async (test: Deno.TestContext) => {
	
};

const testArrayParentParameter = async (test: Deno.TestContext) => {
	
};

const testArrayIndexParameter = async (test: Deno.TestContext) => {
	
};

const testDeeplyNestedArrayValidation = async (test: Deno.TestContext) => {

};