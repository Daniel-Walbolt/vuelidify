import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { bufferAsync, throttleQueueAsync } from "../src/index.ts";
import { pause } from "./main.ts";
import { throttleAsync, trailingDebounceAsync } from "../src/throttleFunctions.ts";

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
		const pausePerCall = timeOfTest / callAmount;

		const callTimestamps: number[] = [];

		const asyncFunction = () => {
			callTimestamps.push(performance.now());
			return 10;
		};

		const throttled = throttleQueueAsync(asyncFunction, throttleTime);

		// Warmup
		await throttled();

		for (let i = 0; i < callAmount; i++) {
			throttled(); // Don't await, just enqueue
			await pause(pausePerCall);
		}

		await pause(throttleTime);

		for (let i = 1; i < callTimestamps.length; i++) {
			const delta = callTimestamps[i] - callTimestamps[i - 1];
			assert(
				delta >= throttleTime - 1,
				`Call ${i} happened too soon from the previous call (${delta}ms instead of ${throttleTime}ms)`,
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
	assertEquals(callArgs, [1], "First call should execute immediately");

	// Rapid calls while the first is running
	const bufferedCalls = [
		buffered(2),
		buffered(3),
		buffered(4),
	];

	// Let the original call finish
	await p1;

	// Wait for the buffered calls to finish
	await Promise.all(bufferedCalls);

	assertEquals(
		callArgs,
		[1, 4],
		"Only the first and the most recent buffered call should have executed",
	);
};

const testDebounceAsync = async (test: Deno.TestContext) => {
	// The async function we will debounce
	const fetchResults = async (query: string) => {
		calls++;
		return `Fetched results for: ${query}`;
	};
	// Create a debounced version of the fetchResults function with a 500ms delay
	const debouncedFetch = trailingDebounceAsync(fetchResults, 500);

	// Set up variables to track the function execution
	let result: string | undefined;
	let calls = 0;

	// Create a mock function to track when the debounced function gets called
	const mockFetch = async (query: string) => {
		result = await debouncedFetch(query);
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
	assertEquals(
		result,
		`Fetched results for: a${CallAmount}`,
		"The debounced function should use the latest parameters.",
	);
};

const testThrottleAsync = async (test: Deno.TestContext) => {
	let calls = 0;

	const DelayMs = 200;
	const { throttledFunc } = throttleAsync((query: string) => {
		calls++;
		return `Fetched results for: ${query}`;
	}, DelayMs);

	// Simulate multiple calls in a short span
	throttledFunc("A"); // should be executed
	throttledFunc("B"); // should not be executed
	throttledFunc("C"); // should not be executed

	// Wait for the throttle period to pass
	await new Promise((resolve) => setTimeout(resolve, DelayMs));

	assertEquals(calls, 1, "throttleAsync did not ignore invocations during the throttle period.");

	const finalResult = throttledFunc("D");

	// Now results should contain only one invocation result
	assertEquals(
		finalResult,
		"Fetched results for: D",
		"throttleAsync did not immediately execute a function after the throttle period has passed",
	);
};
