import { Engine } from "./engine/engine.ts";
import { parse } from "npm:yaml";
import { resolve } from "@std/path";
import type { Spec } from "./types.ts";

const engine = new Engine();

const file = Deno.readTextFileSync(resolve("spec.yaml"));

const fileJson: Spec = parse(file.toString());

await engine.process(fileJson);
