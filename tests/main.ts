import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

export const pause = (length: number = 50) => new Promise(resolve => setTimeout(resolve, length));