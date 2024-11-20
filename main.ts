import { resolve } from "@std/path";
import type { OpenAPIV3 } from "npm:openapi-types";
import { parse } from "npm:yaml";
import { ControllerParser } from "./parsers/controller/controller_parser.ts";
import { ModelParser } from "./parsers/model/model_parser.ts";
import { ServiceParser } from "./parsers/service/service_parser.ts";
import { Engine } from "./scratch/engine/engine.ts";
import { ControllerStore } from "./stores/controller/controller.ts";
import { ModelStore } from "./stores/model/model.ts";
import { ServiceStore } from "./stores/service/service.ts";

const file = Deno.readTextFileSync(resolve("spec.yaml"));

const fileJson: OpenAPIV3.Document = parse(file.toString());

const modelStore = new ModelStore();
const controllerStore = new ControllerStore();
const serviceStore = new ServiceStore();

const modelParser = new ModelParser(modelStore);
const controllerParser = new ControllerParser(controllerStore);
const serviceParser = new ServiceParser(serviceStore);

modelParser.parse(fileJson);
controllerParser.parse(fileJson);
serviceParser.parse(fileJson);

const [models, controllers, services] = [
  modelStore.list(),
  controllerStore.list(),
  serviceStore.list(),
];

const engine = new Engine();

await engine.process(models, controllers, services);
