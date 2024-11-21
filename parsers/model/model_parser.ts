import { Ajv, type ValidateFunction } from "npm:ajv";
import type { OpenAPIV3 } from "npm:openapi-types";
import type { Model } from "../../types/model.d.ts";
import model from "../../schemas/model.json" with { type: "json" };
import type { ModelStore } from "../../stores/model/model.ts";
import { Parser } from "../parser.ts";
import pascalCase from "https://deno.land/x/case@2.2.0/pascalCase.ts";
import { singular } from "https://deno.land/x/deno_plural@2.0.0/mod.ts";

type BaseField = {
  name: string;
  nullable: boolean;
  description: string;
  type: string;
  format?: string | undefined;
  enumValues?: string | undefined;
  ref?: string | undefined;
};
/**
 * The Parsers job is to sanitise and construct OpenAPI specs ready for ingestion by a Generator
 * {@link https://github.com/jonnydgreen/api-framework-codegen/docs/designs/parser.excalidraw.png Design}
 */
export class ModelParser extends Parser {
  readonly #ajv: Ajv;
  readonly #validate: ValidateFunction<OpenAPIV3.Document>;
  readonly #modelStore: ModelStore;

  constructor(modelStore: ModelStore) {
    super();
    this.#ajv = new Ajv({ allErrors: true });
    this.#validate = this.#ajv.compile(model);
    this.#modelStore = modelStore;
  }

  public parse(file: OpenAPIV3.Document): void {
    if (!file.components?.schemas) {
      throw new Error("No schemas found in OpenAPI document");
    }

    Object.entries(file.components.schemas).forEach(([schemaName, schema]) => {
      this.#processSchema(schemaName, schema);
    });
  }

  #processSchema(
    schemaName: string,
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  ): void {
    const compiledModel = this.#compileModel(schema, schemaName);
    this.#validateModel(compiledModel);
    this.#modelStore.set(compiledModel);
  }

  #validateModel(model: Model): void {
    const isValid = this.#validate(model);
    if (!isValid) {
      throw new Error(
        `Schema validation failed for model ${model.name}`,
        { cause: this.#validate.errors },
      );
    }
  }

  #compileModel(
    schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
    modelName: string,
  ): Model {
    if (this.#isReferenceObject(schema)) {
      throw new Error(
        `Reference objects not supported at root level: ${modelName}`,
      );
    }

    return {
      name: modelName,
      fields: this.#compileFields(schema),
      description: schema.description || "",
      imports: this.#generateImports(this.#compileFields(schema)),
    };
  }

  #generateImports(baseField: BaseField[]): Model["imports"] {
    return baseField.filter((value) => value.ref).map((value) => ({
      path: `@/models/${pascalCase(singular(value.ref || ""))}`,
      name: `${pascalCase(singular(value.ref || ""))}`,
    }));
  }

  #compileFields(schema: OpenAPIV3.SchemaObject): Model["fields"] {
    if (schema.type !== "object" || !schema.properties) {
      return [];
    }

    return Object.entries(schema.properties).map(([key, value]) =>
      this.#createField(key, value)
    );
  }

  #createField(
    key: string,
    value: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  ): Model["fields"][number] {
    let baseField: BaseField = {
      type: "",
      name: "",
      nullable: false,
      description: "",
      format: "",
    };

    if ("type" in value) {
      baseField = {
        type: "",
        name: key,
        nullable: value.nullable ?? false,
        description: value.description ?? "",
        format: value.format as string,
      };
    }

    if ("enum" in value) {
      return {
        ...baseField,
        type: value.enum
          ? this.#formatEnumValues(value.enum)
          : value.type || "",
        enumValues: this.#formatEnumValues(value.enum),
      };
    }

    if ("items" in value) {
      return this.#createArrayField(value, baseField);
    }

    if ("type" in value) {
      return {
        ...baseField,
        type: value.type || "",
      };
    }

    return {
      ...baseField,
      type: "",
    };
  }

  #createArrayField(
    value: OpenAPIV3.ArraySchemaObject,
    baseField: BaseField,
  ): BaseField {
    if ("$ref" in value.items) {
      const ref = value.items.$ref.split("/").pop();
      return {
        ...baseField,
        type: `${ref}[]`,
        ref,
      };
    }

    if ("enum" in value.items) {
      return {
        ...baseField,
        type: value.items.enum
          ? this.#formatEnumValues(value.items.enum)
          : value.type || "",
        enumValues: this.#formatEnumValues(value.items.enum),
      };
    }

    return baseField;
  }

  #formatEnumValues(enumValues?: unknown[]): string {
    return enumValues?.map((value) => `"${value}"`).join(" | ") || "";
  }

  #isReferenceObject(
    obj: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  ) {
    return "$ref" in obj;
  }
}
