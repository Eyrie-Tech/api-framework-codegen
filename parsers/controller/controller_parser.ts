import { Ajv, type ValidateFunction } from "npm:ajv";
import type { OpenAPIV3 } from "npm:openapi-types";
import type { Controller } from "../../types/controller.d.ts";
import controller from "../../schemas/controller.json" with { type: "json" };
import type { ControllerStore } from "../../stores/controller/controller.ts";
import { Parser } from "../parser.ts";

/**
 * The Parsers job is to sanitise and construct OpenAPI specs ready for ingestion by a Generator
 * {@link https://github.com/jonnydgreen/api-framework-codegen/docs/designs/parser.excalidraw.png Design}
 */
export class ControllerParser extends Parser {
  #ajv: Ajv = new Ajv();
  #validate: ValidateFunction<OpenAPIV3.Document>;
  #controllerStore: ControllerStore;

  constructor(controllerStore: ControllerStore) {
    super();
    this.#validate = this.#ajv.compile(controller);
    this.#controllerStore = controllerStore;
  }

  public parse(
    file: OpenAPIV3.Document<Record<string | number | symbol, never>>,
  ): void {
    for (const schema in file.components?.schemas) {
      const componentSchema = file.components.schemas[schema];

      if (!componentSchema) {
        throw new Error("Schema not found");
      }

      const compiledController = this.#compileController(componentSchema);

      const performValidation = this.#validate(compiledController);

      if (!performValidation && this.#validate.errors) {
        throw new Error("Schema validation failed");
      }

      this.#controllerStore.set(compiledController);
    }
  }

  #compileController(
    _schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  ): Controller {
    // Do something with schema
    return {
      name: "Test",
      description: "Test description",
      imports: [{
        path: "/service_a",
      }, {
        path: "service_b",
      }],
    };
  }
}
