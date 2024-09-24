<script setup lang="ts" generic="">
	import { Child } from '../types';

	interface Props {
		child: Child;
		validation?: ValidationState<Child, unknown>;
	}

	// Looks like you currently need to access "props" variable in the template in order to get correct types
	// when using ValidationState on an object, Primitives seem to work just fine.
	const props = defineProps<Props>();
</script>

<template>
	<div>
		<span>Age: {{ child.age }}</span>
		<div class="field">
			<label>
				Name
				<input v-model="child.name"/>
				<span v-if="props.validation?.name.isValidating"></span>
			</label>
			<div class="input-errors">
				<p v-for="error in props.validation?.name.errorMessages">{{error}}</p>
			</div>
		</div>
	</div>
</template>