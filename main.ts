import { resolve } from "@std/path";
import type { OpenAPIV3 } from "openapi-types";
import { parse } from "jsr:@std/yaml";
import { Engine } from "./engine/engine.ts";
import { ControllerParser } from "./parsers/controller/controller_parser.ts";
import { ModelParser } from "./parsers/model/model_parser.ts";
import { ServiceParser } from "./parsers/service/service_parser.ts";
import { ControllerStore } from "./stores/controller/controller.ts";
import { ModelStore } from "./stores/model/model.ts";
import { ServiceStore } from "./stores/service/service.ts";

const file = Deno.readTextFileSync(resolve("spec.yaml"));

const fileJson = parse(file.toString()) as OpenAPIV3.Document;

const modelStore = new ModelStore();
const controllerStore = new ControllerStore();
const serviceStore = new ServiceStore();

new ModelParser(modelStore).parse(fileJson);
new ControllerParser(controllerStore).parse(fileJson);
new ServiceParser(serviceStore).parse(fileJson);

const engine = new Engine();

await engine.process(
  modelStore.list(),
  controllerStore.list(),
  serviceStore.list(),
);
