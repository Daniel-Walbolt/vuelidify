<script setup lang="ts">
	import { ref } from 'vue';
	import { useValidation } from "vuelidify";

	type FooBar = {
		a: Zaa,
		b: Zaa[]
	}
	
	type Zaa = {
		name: string;
		age: number;
	}

	const string = ref("");
	const v$ = useValidation({
		objectToValidate: string
	});
</script>