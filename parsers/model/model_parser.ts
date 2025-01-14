import { toPascalCase } from "@std/text";
import { Ajv, type ValidateFunction } from "ajv";
import { singular } from "https://deno.land/x/deno_plural@2.0.0/mod.ts";
import type { OpenAPIV3 } from "openapi-types";
import model from "../../schemas/model.json" with { type: "json" };
import type { Store } from "../../stores/store.ts";
import type { Model } from "../../types/model.d.ts";
import { Parser } from "../parser.ts";

type BaseField = {
  name: string;
  nullable: boolean;
  description: string;
  type: string;
  format?: string | undefined;
  enumValues?: string | undefined;
  ref?: string | undefined;
  topLevel?: boolean | undefined;
};

/**
 * The parser that outputs model definitions to be used by the model builder
 */
export class ModelParser extends Parser {
  readonly #ajv: Ajv;
  readonly #validate: ValidateFunction<OpenAPIV3.Document>;
  readonly #modelStore: Store<Model>;

  constructor(modelStore: Store<Model>) {
    super();
    this.#ajv = new Ajv({ allErrors: true });
    this.#validate = this.#ajv.compile(model);
    this.#modelStore = modelStore;
  }

  /**
   * Used to parse a provided OpenAPI spec and set the final outputs in the model store
   *
   * @param file Represents the resolved OpenAPI spec
   */
  public parse(file: OpenAPIV3.Document): void {
    if (!file.components?.schemas) {
      throw new Error("No schemas found in OpenAPI document");
    }

    Object.entries(file.components.schemas).forEach(([schemaName, schema]) => {
      const model = this.#compileModel(schema, schemaName);
      this.#validateAndStoreModel(model);
    });
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
    return baseField.filter((value) => value.ref || value.topLevel).map((
      value,
    ) => {
      if (value.topLevel) {
        return {
          path: `@/models/${toPascalCase(singular(value.name || ""))}`,
          name: `${toPascalCase(singular(value.type || ""))}`,
        };
      }
      return {
        path: `@/models/${toPascalCase(singular(value.ref || ""))}`,
        name: `${toPascalCase(singular(value.ref || ""))}`,
      };
    });
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
        format: value.format,
      };
    }

    if ("$ref" in value) {
      const ref = value.$ref.split("/").pop();
      return {
        ...baseField,
        name: key,
        type: `${ref}`,
        topLevel: true,
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
        type: this.#handleType(value.type) || "",
      };
    }

    return {
      ...baseField,
      type: "",
    };
  }

  #handleType(type?: string | undefined) {
    const typeMap: { [key: string]: string } = {
      integer: "number",
    };
    return type && typeMap[type] ? typeMap[type] : type;
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

    if ("type" in value.items) {
      return { ...baseField, type: `${value.items.type}[]` };
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

  #validateAndStoreModel(model: Model): void {
    if (!this.#validate(model)) {
      throw new Error(
        `Schema validation failed for model: ${model.name}`,
        { cause: this.#validate.errors },
      );
    }
    this.#modelStore.set(model);
  }
}
