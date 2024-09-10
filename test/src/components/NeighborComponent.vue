<script setup lang="ts" generic="">
	import { ValidationState,  } from 'vue-final-form';
	import { Person } from '../types';
	import ChildComponent from './ChildComponent.vue';

	interface Props {
		person: Person;
		validation?: ValidationState<Person, unknown>;
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
				<span v-if="props.validation?.name.isValidating"></span>
			</label>
			<div class="input-errors">
				<p v-for="error in props.validation?.name.errorMessages">{{error}}</p>
			</div>
		</div>
		<div class="field">
			<label>
				Age
				<input v-model="person.age"/>
				<span v-if="props.validation?.age.isValidating"></span>
			</label>
			<div class="input-errors">
				<p v-for="error in props.validation?.age.errorMessages">{{error}}</p>
			</div>
		</div>
		<div class="field">
			<label>
				Validate Children
				<input v-model="person.validateChildren" type="checkbox"/>
			</label>
		</div>
	</section>
	<h3>Children</h3>
	<section>
		<ChildComponent
			v-for="child,i in person.children"
			:child="child"
			:validation="props.validation?.children.arrayState[i]"
		/>
	</section>
	<template v-if="person.neighbors && person.neighbors.length > 0">
		<h3>Neighbors</h3>
		<div class="form">
			<template v-for="neighbor,i in person.neighbors">
				<p>Neighbor {{ i }}</p>
				<NeighborComponent
					:person="neighbor"
					:validation="props.validation?.neighbors.arrayState[i]"
				/>
			</template>
		</div>
	</template>
	<hr class="hr"/>
</template>

<style scoped>
	hr { 
		margin: 1rem 0px;
		border-color: rgb(60,60,60);
		width: 25%;
	}
</style>