import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { bufferAsync, throttleAsync } from "../src/index.ts";
import { pause } from "./main.ts";

Deno.test("Test Throttle Functions", async (test: Deno.TestContext) =>  {
	await test.step("Test throttleAsync (400ms every 75ms)", parameterizedThrottleTest(400, 75)),
	await test.step("Test throttleAsync (100ms every 20ms)", parameterizedThrottleTest(100, 20)),
	await test.step("Test throttleAsync (1000ms every 100ms)", parameterizedThrottleTest(1000, 100, 50));
	await test.step("Test bufferAsync", testBufferAsync);
});

function parameterizedThrottleTest(timeOfTest: number, throttleTime: number, callAmount: number = 20) {
	return async (test: Deno.TestContext) => {
		const pausePerCall = timeOfTest / callAmount;

		const callTimestamps: number[] = [];

		const asyncFunction = () => {
			callTimestamps.push(performance.now());
			return 10;
		};

		const throttled = throttleAsync(asyncFunction, throttleTime);

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
		buffered(4)
	];

	// Let the original call finish
	await p1;

	// Wait for the buffered calls to finish
	await Promise.all(bufferedCalls);

	assertEquals(
		callArgs,
		[1, 4],
		"Only the first and the most recent buffered call should have executed"
	);
};