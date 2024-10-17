import { resolve } from "@std/path";
import { parse } from "npm:yaml";
import { ModelParser } from "./parsers/model/model_parser.ts";
import type { OpenAPIV3 } from "npm:openapi-types";
import { ModelStore } from "./stores/model/model.ts";
import { ControllerStore } from "./stores/controller/controller.ts";
import { ControllerParser } from "./parsers/controller/controller_parser.ts";
import { inspect } from "node:util";

const file = Deno.readTextFileSync(resolve("spec.yaml"));

const fileJson: OpenAPIV3.Document = parse(file.toString());

const modelStore = new ModelStore();
const controllerStore = new ControllerStore();

const modelParser = new ModelParser(modelStore);
const controllerParser = new ControllerParser(controllerStore);

modelParser.parse(fileJson);
controllerParser.parse(fileJson);

const [models, controllers] = [modelStore.get(), controllerStore.get()];

console.log(inspect(models, { depth: 100, colors: true }));
