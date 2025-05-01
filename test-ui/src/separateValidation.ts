import { minLength, type Validation } from "../../dist";
import type { Person } from "./types";

export const PartialPersonValidation: Validation<Person> = {
	name: {
		$reactive: [minLength(10)]
	},
	age: {
	},
	countChildren: {},
	children: {
		$each: {
			name: {
				$reactive: []
			}
		}
	},
}