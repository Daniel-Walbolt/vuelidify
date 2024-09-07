export type Child = {
	name: string;
	age: number;
}

export type Person = {
	name: string;
	age: number;
	validateChildren: boolean;
	validateNeighbors: boolean;
	countChildren: number;
	children: Child[],
	neighbors: Person[]
}