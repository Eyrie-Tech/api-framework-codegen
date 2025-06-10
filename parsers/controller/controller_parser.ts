import { toCamelCase } from "@std/text/to-camel-case";
import { toPascalCase } from "@std/text/to-pascal-case";
import { Ajv, type ValidateFunction } from "ajv";
import { singular } from "https://deno.land/x/deno_plural@2.0.0/mod.ts";
import type { OpenAPIV3 } from "openapi-types";
import controllerSchema from "../../schemas/controller.json" with {
  type: "json"
};
import type { Store } from "../../stores/store.ts";
import type { Controller } from "../../types/controller.d.ts";
import { NameBuilder } from "../../utils/name_builder.ts";
import { Parser } from "../parser.ts";

/**
 * The parser that outputs a controller definition to be used by the controller builder
 */
export class ControllerParser extends Parser {
  #ajv: Ajv = new Ajv();
  #validate: ValidateFunction<OpenAPIV3.Document>;
  #controllerStore: Store<Controller>;

  constructor(controllerStore: Store<Controller>) {
    super();
    this.#validate = this.#ajv.compile(controllerSchema);
    this.#controllerStore = controllerStore;
  }

  /**
   * Used to parse a provided OpenAPI spec and set the final outputs in the controller store
   *
   * @param file Represents the resolved OpenAPI spec
   */
  public parse(file: OpenAPIV3.Document): void {
    Object.entries(file.paths).forEach(([path, pathItem]) => {
      if (pathItem) {
        const controller = this.#compileController(pathItem, path);
        this.#validateAndStoreController(controller);
      }
    });
  }

  #compileController(
    pathItem: OpenAPIV3.PathItemObject,
    path: string,
  ): Controller {
    const methods = this.#compileMethods(pathItem, path);
    const controllerName = toPascalCase(
      singular(this.#extractControllerName(path)),
    );

    if (this.#controllerStore.has(controllerName)) {
      return this.#mergeWithExistingController(controllerName, methods);
    }

    return this.#createNewController(controllerName, methods);
  }

  #compileMethods(
    pathItem: OpenAPIV3.PathItemObject,
    path: string,
  ): Controller["methods"] {
    return Object.entries(pathItem)
      .filter(([method]) =>
        ["get", "post", "put", "delete", "patch"].includes(method)
      )
      .map(([method, operation]) => {
        if (typeof operation === "object" && "operationId" in operation) {
          return {
            type: toPascalCase(method),
            name: "operationId" in operation ? operation.operationId : "",
            parameters: this.#generateParameters(operation),
            url: path,
            contentType: this.#extractContentType(operation.responses),
          };
        }
        throw new Error(
          `${(operation as { summary: string }).summary
          } is missing an operationId`,
        );
      }) as Controller["methods"];
  }

  #generateParameters(
    operation: OpenAPIV3.OperationObject,
  ): {
    params?: unknown[];
    body?: {
      name?: string | undefined;
      type?: string | undefined;
    }[];
  } {
    const args: {
      params?: unknown[];
      body?: { name?: string | undefined; type?: string | undefined }[];
    } = {};

    if (operation.parameters) {
      args.params = operation.parameters.map((parameter) => {
        if ("name" in parameter) {
          return {
            in: parameter.in,
            name: toCamelCase(singular(parameter.name)),
            required: parameter.required,
          };
        }
      });
    }

    if (operation.requestBody) {
      const content =
        (operation.requestBody as OpenAPIV3.RequestBodyObject).content;
      const contentType = Object.keys(content)[0];
      if (contentType && content[contentType]) {
        const schema = content[contentType].schema as OpenAPIV3.ReferenceObject;
        if (schema.$ref) {
          args.body = [{
            name: toCamelCase(
              singular(schema.$ref.split("/").pop()?.toString() ?? ""),
            ),
            type: `${schema.$ref.split("/").pop()}`,
          }];
        }
      }
    }

    return args;
  }

  #extractContentType(
    responses?: OpenAPIV3.ResponsesObject,
  ): string | undefined {
    if (!responses) return undefined;
    const successResponse = responses["200"] || responses["201"];
    if (
      successResponse && "content" in successResponse &&
      successResponse?.content
    ) {
      return Object.keys(successResponse.content)[0];
    }
    return undefined;
  }

  #extractControllerName(path: string): string {
    return path.split("/")[1] || "";
  }

  #mergeWithExistingController(
    controllerName: string,
    newMethods: Controller["methods"],
  ): Controller {
    const existingController = this.#controllerStore.get(controllerName)!;
    return {
      ...existingController,
      imports: this.#generateImports(
        existingController.methods,
        controllerName,
      ),
      methods: [
        ...(existingController.methods),
        ...newMethods,
      ],
    };
  }

  #createNewController(
    controllerName: string,
    methods: Controller["methods"],
  ): Controller {
    return {
      name: controllerName,
      description: "",
      methods,
      imports: this.#generateImports(methods, controllerName),
    };
  }

  #generateImports(
    controllerMethods: Controller["methods"],
    controllerName: string,
  ): Controller["imports"] {
    const allControllerImports =
      controllerMethods.flatMap((controllerMethod) => {
        return controllerMethod.parameters?.body?.map((controllerBody) => ({
          path: `@/models/${toPascalCase(singular(controllerBody.name))}`,
          name: `${toPascalCase(singular(controllerBody.name))}`,
        })) || [];
      }) || [];

    return allControllerImports.reduce(
      (controllerImports: Controller["imports"], currentImport) => {
        if (
          controllerImports.find((controllerImport) =>
            controllerImport.name === currentImport.name
          )
        ) {
          return controllerImports;
        } else {
          controllerImports.push({
            path: `@/models/${toPascalCase(singular(currentImport.name))}`,
            name: `${toPascalCase(singular(currentImport.name))}`,
          });
        }
        return [...controllerImports, {
          name: NameBuilder({
            name: controllerName,
            kind: "className",
            type: "Service",
          }),
          path: `@/services/${toPascalCase(singular(NameBuilder({
            kind: "className",
            name: controllerName,
            type: "Service",
          })))
            }`,
        }];
      },
      [],
    );
  }

  #validateAndStoreController(controller: Controller): void {
    if (!this.#validate(controller)) {
      throw new Error(
        `Schema validation failed for controller: ${controller.name}`,
        { cause: this.#validate.errors },
      );
    }
    this.#controllerStore.set(controller);
  }
}
