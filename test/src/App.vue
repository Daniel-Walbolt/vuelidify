<script setup lang="ts">
  import { ref } from "vue";
  import { minimumLength, useValidation } from "vue-final-form"
  const stringTest = ref<string>();
  const v$ = useValidation({
    objectToValidate: stringTest,
    validation: {
      $reactive: [minimumLength(4)]
    },
    delayReactiveValidation: false
  });
</script>

<template>
  <div class="main">
    <label>
      Validation Test 1
      <input v-model="stringTest"/>
    </label>
    <div class="input-errors">
      <p v-for="error in v$.propertyState.errorMessages">{{error}}</p>
    </div>
  </div>
</template>

<style scoped>
  .main {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .input-errors {
    display: flex;
    flex-direction: column;
    color: red;
    align-items: flex-end;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  input {
    padding: 0.25rem 0.5rem;
    background: rgba(25,25,25,0.5);
    border: none;
    border-bottom: 2px solid rgb(180,180,180);
    color: white;
    box-shadow: none;
    transition: border-color 0.2s ease;
    &:focus {
      outline: none;
      border-color: aqua;
    }
  }
</style>