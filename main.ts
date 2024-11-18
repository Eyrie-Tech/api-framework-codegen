import { resolve } from "@std/path";
import { parse } from "npm:yaml";
import { ModelParser } from "./parsers/model/model_parser.ts";
import type { OpenAPIV3 } from "npm:openapi-types";
import { ModelStore } from "./stores/model/model.ts";
import { ControllerStore } from "./stores/controller/controller.ts";
import { ControllerParser } from "./parsers/controller/controller_parser.ts";
import { inspect } from "node:util";
import { ServiceStore } from "./stores/service/service.ts";
import { ServiceParser } from "./parsers/service/service_parser.ts";

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

console.log(
  "Controllers:",
  inspect(controllers.values(), { depth: 100, colors: true }),
);
console.log(
  "Services:",
  inspect(services.values(), { depth: 100, colors: true }),
);
console.log(
  "Models:",
  inspect(models.values(), { depth: 100, colors: true }),
);
