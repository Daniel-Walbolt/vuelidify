# Veenesse Forms

[Installation](#installation)
[Configuration](#configuration)
[Usage](#usage)
---
*A simple and lightweight Vue 3 model based validation library with strong type support.*

A play on words between "Vue" and "finesse," this library was inspired by Vuelidate but seeks to solve some of its biggest problems. Unlike Vuelidate, this library does NOT support Vue2. Technology must move forward.

This library is simple because it does exactly what it needs to and nothing more. Basic usage of this library is easy, but complex usage is significantly difficult. The types required to make everything type safe may be confusing, but I'll do my best to explain it here.

Too many validation libraries that exist for Vue lack good type support. This directly impacts maintainability of code; changes to models will not indicate that validation needs to be updated accordingly. I sought to fix that problem

---

## Installation

```sh
npm i veenesse-forms
```

```sh
yarn add veenesse-forms
```

```sh
pnpm add veenesse-forms
```

## Usage

This was created for use in ```<script setup lang="ts">```, meaning you need TypeScript in order to get the full benefits of this library.

1. First