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

      const compiledModel = this.#compileModel(componentSchema, schema);

      const performValidation = this.#validate(compiledModel);

      if (!performValidation && this.#validate.errors) {
        console.error(this.#validate.errors);
        throw new Error("Schema validation failed");
      }

      this.#modelStore.set(compiledModel);
    }
  }

  #compileModel(
    schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
    modelName: string,
  ): Model {
    const fields: Model["fields"] = [];

    if ("$ref" in schema) {
      return {} as Model;
    } else {
      if (schema.type === "object" && schema.properties) {
        for (const [key, value] of Object.entries(schema.properties)) {
          if ("items" in value) {
            if ("$ref" in value.items) {
              const ref = value.items.$ref.split("/").pop();
              fields.push({
                name: key,
                type: `${value.type}(${ref})`,
                nullable: value.nullable || true,
                description: value.description || "",
                format: value.format,
              });
            }

            if ("enum" in value.items) {
              fields.push({
                name: key,
                type: "enum",
                enumValues: value.items.enum,
                nullable: value.nullable || true,
                description: value.description || "",
                format: value.format,
              });
            }
          } else if ("type" in value) {
            fields.push({
              name: key,
              type: value.enum ? "enum" : value.type || "",
              nullable: value.nullable || true,
              description: value.description || "",
              format: value.format,
            });
          }
        }
      }
    }

    return {
      name: modelName,
      fields,
      description: "",
    };
  }
}
