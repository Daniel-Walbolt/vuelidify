import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { pause } from "./main.ts";
import {
	bufferAsync,
	IGNORE_RESULT,
	throttleAsync,
	throttleBufferAsync,
	trailingDebounceAsync,
} from "../src/throttleFunctions.ts";

Deno.test("Test Throttle Functions", async (test: Deno.TestContext) => {
	await test.step("Test throttleBufferAsync (400ms every 75ms)", parameterizedThrottleTest(400, 75));
	await test.step("Test throttleBufferAsync (100ms every 20ms)", parameterizedThrottleTest(100, 20));
	await test.step("Test throttleBufferAsync (1000ms every 100ms)", parameterizedThrottleTest(1000, 100, 50));
	await test.step("Test bufferAsync", testBufferAsync);
	await test.step("Test throttleAsync", testThrottleAsync);
	await test.step("Test trailingDebounceAsync", testDebounceAsync);
});

function parameterizedThrottleTest(timeOfTest: number, throttleTime: number, callAmount: number = 20) {
	return async (test: Deno.TestContext) => {
		const PAUSE_PER_CALL = timeOfTest / callAmount;

		const callTimestamps: number[] = [];
		const PASSING_VALUE = 10;

		const asyncFunction = () => {
			callTimestamps.push(performance.now());
			return PASSING_VALUE;
		};

		const throttled = throttleBufferAsync(asyncFunction, throttleTime);

		const results: (number | typeof IGNORE_RESULT)[] = [];

		// Warmup
		await throttled();

		const asyncWrapper = async () => {
			// Add the results to the array.
			results.push(await throttled());
		};

		for (let i = 0; i < callAmount; i++) {
			asyncWrapper();
			await pause(PAUSE_PER_CALL);
		}

		await pause(throttleTime);

		for (let i = 1; i < callTimestamps.length; i++) {
			const delta = callTimestamps[i] - callTimestamps[i - 1];
			assert(
				delta >= throttleTime - 1,
				`Call ${i} happened too soon from the previous call (${delta}ms instead of ${throttleTime}ms)`,
			);
		}

		// Get the results which did not return the expected value to make sure
		// ignored invocations return a unique symbol.
		const ignoredResults = results.filter((x) => x !== PASSING_VALUE);
		for (let i = 0; i < ignoredResults.length; i++) {
			assertEquals(
				ignoredResults[i],
				IGNORE_RESULT,
				"throttleBufferAsync did not return a unique symbol for ignored invocations.",
			);
		}
	};
}

const testBufferAsync = async (test: Deno.TestContext) => {
	const callArgs: number[] = [];

	const fn = async (val: number) => {
		callArgs.push(val);
		await pause(100);
	};

	const buffered = bufferAsync(fn);

	// First call: executes immediately
	const p1 = buffered(1);
	await pause(10);
	assertEquals(callArgs, [1], "First call to bufferAsync should execute immediately");

	// Rapid calls while the first is running
	const bufferedCalls = [
		buffered(2),
		buffered(3),
		buffered(4),
	];

	// Let the original call finish
	await p1;

	// Wait for the buffered calls to finish
	const results = await Promise.all(bufferedCalls);

	assertEquals(
		callArgs,
		[1, 4],
		"Only the first and the most recent buffered call should have executed",
	);
	assertEquals(
		[results[0], results[1]],
		[IGNORE_RESULT, IGNORE_RESULT],
		"bufferAsync did not return a unique symbol for ignored invocations.",
	);
};

const testDebounceAsync = async (test: Deno.TestContext) => {
	// The async function we will debounce
	const fetchResults = (query: string) => {
		calls++;
		return `Fetched results for: ${query}`;
	};
	// Create a debounced version of the fetchResults function with a 500ms delay
	const debouncedFetch = trailingDebounceAsync(fetchResults, 500);

	// Set up variables to track the function execution
	const results: (string | typeof IGNORE_RESULT)[] = [];
	let calls = 0;

	// Create a mock function to track when the debounced function gets called
	const mockFetch = async (query: string) => {
		results.push(await debouncedFetch(query));
	};

	const CallAmount = 1000;
	// Call the function multiple times rapidly
	for (let i = 1; i <= CallAmount; i++) {
		mockFetch(`a${i}`);
	}

	// Wait for a bit longer than the debounce delay
	await new Promise((resolve) => setTimeout(resolve, 600));

	// Ensure that the function was only called once with the latest parameters ("abcd")
	assertEquals(calls, 1, "The debounced function should only be called once.");
	for (let i = 0; i < CallAmount - 1; i++) {
		assert(
			results[i] === IGNORE_RESULT,
			"trailingDebounceAsync did not return unique symbol on an ignored invocation.",
		);
	}
	assertEquals(
		results[CallAmount - 1],
		`Fetched results for: a${CallAmount}`,
		"The debounced function should use the latest parameters.",
	);
};

const testThrottleAsync = async (test: Deno.TestContext) => {
	let calls = 0;

	const DelayMs = 200;
	const { isThrottled, throttledFunc } = throttleAsync(async (query: string) => {
		await pause(100);
		calls++;
		return `Fetched results for: ${query}`;
	}, DelayMs);

	// Simulate multiple calls in a short span
	const result1 = throttledFunc("A"); // should be executed
	const result2 = throttledFunc("B"); // should not be executed
	const result3 = throttledFunc("C"); // should not be executed
	await pause(15);
	assertEquals(
		isThrottled.value,
		true,
		"throttleAsync did not set isThrottled to true while throttle should be active.",
	);
	assertEquals(result2, IGNORE_RESULT, "throttleAsync did not return a unique symbol for ignored calls");
	assertEquals(result3, IGNORE_RESULT, "throttleAsync did not return a unique symbol for ignored calls");
	// Wait for the throttle period to pass
	const ret = await result1;

	assertEquals(
		ret,
		"Fetched results for: A",
		"throttleAsync did not return the expected value. Is it calling the function provided?",
	);
};
