import { Child, Person } from "./types";

const names = ["Alex", "Daniel", "Jacob", "Wendy", "Steve", "Phil", "Mike", "Brandon", "John", "Miranda", "Kyle", "Yoda", "Padame", "Tony"];
export const randomPerson = (genNeighbors: boolean = true, genBestFriend: boolean = true, maxChildren: number = 1, maxNeighbors: number = 2): Person => {
	const countChildren = Math.ceil(Math.random() * maxChildren);
	const children = []
	for (let i = 0; i < countChildren; i++) { children.push(randomChild()); }
	const countNeighbors = Math.ceil(Math.random() * maxNeighbors);
	const neighbors = [];
	if (genNeighbors) {
		for (let i = 0; i < countNeighbors; i++) { neighbors.push(randomPerson(false)); }
	}
	return {
		name: randomName(),
		age: Math.ceil(Math.random() * 30 + 23),
		validateChildren: true,
		validateNeighbors: true,
		countChildren: countChildren,
		children: children,
		neighbors: neighbors,
		bestFriend: genBestFriend ? randomPerson(false, false, 0, 0) : undefined,
	}
}

const randomName = () => names[Math.floor(Math.random() * names.length)];

const randomChild = (): Child => ({
	name: randomName(),
	age: Math.ceil(Math.random() * 12)
});