<script setup lang="ts">
	interface AssertIsProps {
		assert: boolean;
		message: string;
	}
	defineProps<AssertIsProps>();
</script>

<template>
	<div class="card">
		<div
			class="icon-area"
			:class="{
				'success': assert,
				'error': !assert
			}"
		>
			<span class="icon">{{ assert ? '✓' : '❌' }}</span>
		</div>
		<p class="message-area">
			{{ message }}
		</p>
	</div>
</template>

<style scoped>
	.card {
		display: flex;
		border-radius: 1rem;
		background-color: rgb(30,30,30);
		overflow: hidden;
		max-width: 400px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
	}

	.icon-area {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 60px;
		font-size: 24px;
		color: white;
	}

	.icon-area.success {
		background-color: #4caf50; /* green */
	}

	.icon-area.error {
		background-color: #f44336; /* red */
	}

	.icon {
		font-size: 28px;
	}

	.message-area {
		flex: 1;
		padding: 8px 16px;
		font-size: 16px;
	}
</style>