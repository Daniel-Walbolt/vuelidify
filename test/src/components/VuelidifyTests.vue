<script setup lang="ts">

</script>

<template>
	<div class="container">
		<nav class="navbar">
			<router-link :to="{ path: '/vuelidify/primitive-test' }" class="navlink">Primitive Validation</router-link>
			<router-link :to="{ name: 'VuelidifySimpleObject' }" class="navlink">Simple Object Validation</router-link>
			<router-link :to="{ name: 'VuelidifyOptionalObject' }" class="navlink">Optional Object Validation</router-link>
			<router-link :to="{ name: 'VuelidifyObjectArray' }" class="navlink">Object Array Validation</router-link>
			<router-link :to="{ name: 'VuelidifyComplexObject' }" class="navlink">Complex Object Validation</router-link>
			<router-link :to="{ name: 'VuelidifyTests' }" class="navlink">Automated Tests</router-link>
		</nav>
		<hr />
		<div class="content">
			<RouterView />
		</div>
	</div>
</template>

<style scoped>
	.container {
		display: flex;
		flex-direction: column;
		gap: 4;
		width: 100%;
	}
	.navbar {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1rem;
		padding: 1rem 4rem;
	}
	.navlink {
		padding: 1rem 2rem;
		border: 2px solid #333333;
		border-radius: 1rem;
		color: white;
		transition: color 0.2s ease;
		&:hover {
			color: lightblue;
		}
		&:active {
			color: blue;
		}
	}
	.content {
		padding: 2rem 1rem;
	}
</style>