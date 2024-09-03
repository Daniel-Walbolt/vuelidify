<script setup lang="ts" generic="">
	import { Primitive, ValidationState } from 'vue-final-form';
	import { Child } from '../types';

	interface Props {
		child: Child;
		validation: ValidationState<Child, unknown>;
	}

	const props = defineProps<Props>();
</script>

<template>
	<div>
		<span>Age: {{ child.age }}</span>
		<div class="field">
			<label>
				Name
				<input v-model="child.name"/>
				<span>{{  }}</span>
			</label>
			<div class="input-errors">
				<p v-for="error in validation">{{error}}</p>
			</div>
		</div>
	</div>
</template>