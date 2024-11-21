import { resolve } from "@std/path";
import type { OpenAPIV3 } from "npm:openapi-types";
import { parse } from "npm:yaml";
import { ControllerParser } from "./parsers/controller/controller_parser.ts";
import { ModelParser } from "./parsers/model/model_parser.ts";
import { ServiceParser } from "./parsers/service/service_parser.ts";
import { Engine } from "./engine/engine.ts";
import { ControllerStore } from "./stores/controller/controller.ts";
import { ModelStore } from "./stores/model/model.ts";
import { ServiceStore } from "./stores/service/service.ts";

// Read in file
const file = Deno.readTextFileSync(resolve("spec.yaml"));

// Parse the file
const fileJson: OpenAPIV3.Document = parse(file.toString());

// Set up stores to hold resources
const modelStore = new ModelStore();
const controllerStore = new ControllerStore();
const serviceStore = new ServiceStore();

// Setup parsers and pass in the store to use for each
const modelParser = new ModelParser(modelStore);
const controllerParser = new ControllerParser(controllerStore);
const serviceParser = new ServiceParser(serviceStore);

// Parse the Spec file
modelParser.parse(fileJson);
controllerParser.parse(fileJson);
serviceParser.parse(fileJson);

// List out the created resources
const [models, controllers, services] = [
  modelStore.list(),
  controllerStore.list(),
  serviceStore.list(),
];

// Setup the engine
const engine = new Engine();

// Process the resources for creation with TS Morph
await engine.process(models, controllers, services);
