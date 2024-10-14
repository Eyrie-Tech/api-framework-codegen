import { Ajv, type ValidateFunction } from "npm:ajv";
import type { OpenAPIV3 } from "npm:openapi-types";
import type { Model } from "../../types/model.d.ts";
import model from "../../schemas/model.json" with { type: "json" };
import type { ModelStore } from "../../stores/model/model.ts";
import { Parser } from "../parser.ts";

/**
 * The Parsers job is to sanitise and construct OpenAPI specs ready for ingestion by a Generator
 * {@link https://github.com/jonnydgreen/api-framework-codegen/docs/designs/parser.excalidraw.png Design}
 */
export class ModelParser extends Parser {
  #ajv: Ajv = new Ajv();
  #validate: ValidateFunction<OpenAPIV3.Document>;
  #modelStore: ModelStore;

  constructor(modelStore: ModelStore) {
    super();
    this.#validate = this.#ajv.compile(model);
    this.#modelStore = modelStore;
  }

  public parse(
    file: OpenAPIV3.Document<Record<string | number | symbol, never>>,
  ): void {
    for (const schema in file.components?.schemas) {
      const componentSchema = file.components.schemas[schema];

      if (!componentSchema) {
        throw new Error("Schema not found");
      }

      const compiledModel = this.#compileModel(componentSchema);

      const performValidation = this.#validate(compiledModel);

      if (!performValidation && this.#validate.errors) {
        throw new Error("Schema validation failed");
      }

      this.#modelStore.set(compiledModel);
    }
  }

  #compileModel(
    _schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  ): Model {
    // Do something with schema
    return {
      name: "Test",
      description: "Test description",
      fields: [{
        description: "Test Field",
        format: "date-time",
        type: "string",
        name: "createdAt",
        nullable: false,
      }],
    };
  }
}
