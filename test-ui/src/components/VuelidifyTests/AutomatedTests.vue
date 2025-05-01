<script setup lang="ts">
	import AutomatedTest from './AutomatedTest.vue';
	import { StringTest } from '../../tests/string-test';

	// #region Test 1
	const tests = [
		StringTest
	];
	// #endregion

</script>

<template>
	<div>
		<AutomatedTest
			v-for="test, i in tests"
			:key="i"
			:test-results="test.testResults.value"
			:state="test.v$.state"
		/>
	</div>
</template>