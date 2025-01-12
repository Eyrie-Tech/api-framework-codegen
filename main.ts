import { resolve } from "@std/path";
import { parse as DenoParse } from "https://deno.land/std@0.200.0/flags/mod.ts";
import { parse } from "jsr:@std/yaml";
import type { OpenAPIV3 } from "openapi-types";
import { Engine } from "./engine/engine.ts";
import { ControllerParser } from "./parsers/controller/controller_parser.ts";
import { ModelParser } from "./parsers/model/model_parser.ts";
import { ServiceParser } from "./parsers/service/service_parser.ts";
import { Store } from "./stores/store.ts";
import type { Controller } from "./types/controller.d.ts";
import type { Model } from "./types/model.d.ts";
import type { Service } from "./types/service.d.ts";

const main = async () => {
  const { spec } = DenoParse(Deno.args);

  const file = await Deno.readTextFile(resolve(spec));
  const fileJson = parse(file.toString()) as OpenAPIV3.Document;

  const modelStore = new Store<Model>();
  const controllerStore = new Store<Controller>();
  const serviceStore = new Store<Service>();

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
