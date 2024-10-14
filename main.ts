import { resolve } from "@std/path";
import { parse } from "npm:yaml";
import { ModelParser } from "./parsers/model/model_parser.ts";
import type { OpenAPIV3 } from "npm:openapi-types";
import { ModelStore } from "./stores/model/model.ts";

const file = Deno.readTextFileSync(resolve("spec.yaml"));

const fileJson: OpenAPIV3.Document = parse(file.toString());

const modelStore = new ModelStore();
const modelParser = new ModelParser(modelStore);

modelParser.parse(fileJson);

modelStore.get().forEach((model) => console.log(model));
