<script setup lang="ts" generic="">
	import { Primitive, ValidationState } from 'vue-final-form';
	import { Child, Person } from '../types';
	import ChildComponent from './ChildComponent.vue';

	interface Props {
		person: Person;
		validation: ValidationState<Person, unknown>;
	}

	// Looks like you currently need to access "props" variable in the template in order to get correct types
	// when using ValidationState on an object, Primitives seem to work just fine.
	const props = defineProps<Props>();
</script>

<template>
	<section>
		<div class="field">
			<label>
				Name
				<input v-model="person.name"/>
				<span v-if="props.validation.name.isValidating"></span>
			</label>
			<div class="input-errors">
				<p v-for="error in props.validation.name.errorMessages">{{error}}</p>
			</div>
		</div>
		<div class="field">
			<label>
				Age
				<input v-model="person.age"/>
				<span v-if="props.validation.age.isValidating"></span>
			</label>
			<div class="input-errors">
				<p v-for="error in props.validation.age.errorMessages">{{error}}</p>
			</div>
		</div>
	</section>
	<h3>Children</h3>
	<section>
		<ChildComponent
			v-for="child,i in person.children"
			:child="child"
			:validation="props.validation.children.arrayState[i]"
		/>
	</section>
	<h3>Neighbors</h3>
	<div class="form">
		<NeighborComponent
			v-for="neighbor,i in person.neighbors"
			:person="neighbor"
			:validation="props.validation.neighbors.arrayState[i]"
		/>
	</div>
</template>