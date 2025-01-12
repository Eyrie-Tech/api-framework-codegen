import { resolve } from "@std/path";
import { parse as DenoParse } from "https://deno.land/std@0.200.0/flags/mod.ts";
import { parse } from "jsr:@std/yaml";
import type { OpenAPIV3 } from "openapi-types";
import { Engine } from "./engine/engine.ts";
import { ControllerParser } from "./parsers/controller/controller_parser.ts";
import { ModelParser } from "./parsers/model/model_parser.ts";
import { ServiceParser } from "./parsers/service/service_parser.ts";
import { ControllerStore } from "./stores/controller/controller.ts";
import { ModelStore } from "./stores/model/model.ts";
import { ServiceStore } from "./stores/service/service.ts";

const main = async () => {
  const { spec } = DenoParse(Deno.args);

  const file = await Deno.readTextFile(resolve(spec));

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
};

main();
