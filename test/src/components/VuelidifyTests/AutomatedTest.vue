<script setup lang="ts">
	import { ref, computed } from 'vue';

	export type TestResult = {
		passed: boolean;
		message: string;
	}

	interface AutomatedTestProps {
		testResults: TestResult[];
		state: object;
	}
	const props = defineProps<AutomatedTestProps>();

	const isOpen = ref(false);
	const toggleOpen = () => {
		isOpen.value = !isOpen.value;
	};

	const allPassed = computed(() => props.testResults.every(t => t.passed));
</script>

<template>
	<div class="tester-card">
		<div class="header" @click="toggleOpen">
			<span class="status-icon">
			{{ allPassed ? '✓' : '❌' }}
			</span>
			<span class="title">Validation Test Results</span>
			<span class="chevron">{{ isOpen ? '▲' : '▼' }}</span>
		</div>
	
		<div v-if="isOpen" class="results">
			<ul>
				<li
					v-for="test in testResults"
					:class="{ passed: test.passed, failed: !test.passed }"
				>
					{{ test.message }} - {{ test.passed ? 'Passed' : 'Failed' }}
					<span class="result-icon">{{ test.passed ? '✔️' : '❌' }}</span>
				</li>
			</ul>
		</div>
	</div>
</template>

<style scoped>
	.tester-card {
		background-color: rgb(20, 20, 20);
		border-radius: 10px;
		max-width: 500px;
		margin: 1rem auto;
		box-shadow: 0 2px 5px rgba(0,0,0,0.1);
		font-family: sans-serif;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		cursor: pointer;
		border-bottom: 1px solid #ddd;
	}

	.status-icon {
		font-size: 20px;
		margin-right: 10px;
	}

	.chevron {
		font-size: 18px;
	}

	.title {
		flex-grow: 1;
		font-weight: bold;
	}

	.results {
		padding: 16px;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	li {
		padding: 6px 0;
		display: flex;
		justify-content: space-between;
	}

	.passed {
		color: green;
	}

	.failed {
		color: red;
	}
</style>