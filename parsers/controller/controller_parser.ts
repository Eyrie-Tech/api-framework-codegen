import { pascalCase } from "https://deno.land/x/case@2.2.0/mod.ts";
import { singular } from "https://deno.land/x/deno_plural@2.0.0/mod.ts";
import { Ajv, type ValidateFunction } from "npm:ajv";
import type { OpenAPIV3 } from "npm:openapi-types";
import controllerSchema from "../../schemas/controller.json" with {
  type: "json",
};
import type { ControllerStore } from "../../stores/controller/controller.ts";
import type { Controller } from "../../types/controller.d.ts";
import { Parser } from "../parser.ts";
import camelCase from "https://deno.land/x/case@2.2.0/camelCase.ts";
import { NameBuilder } from "../../utils/name_builder.ts";

/**
 * The parser that outputs a controller definition to be used by the controller builder
 */
export class ControllerParser extends Parser {
  #ajv: Ajv = new Ajv();
  #validate: ValidateFunction<OpenAPIV3.Document>;
  #controllerStore: ControllerStore;

  constructor(controllerStore: ControllerStore) {
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
    const functions = this.#compileFunctions(pathItem, path);
    const controllerName = pascalCase(
      singular(this.#extractControllerName(path)),
    );

    if (this.#controllerStore.has(controllerName)) {
      return this.#mergeWithExistingController(controllerName, functions);
    } else {
      return this.#createNewController(controllerName, functions);
    }
  }

  #compileFunctions(
    pathItem: OpenAPIV3.PathItemObject,
    path: string,
  ): Controller["functions"] {
    return Object.entries(pathItem)
      .filter(([method]) =>
        ["get", "post", "put", "delete", "patch"].includes(method)
      )
      .map(([method, operation]) => {
        if (typeof operation === "object" && "operationId" in operation) {
          return {
            type: method,
            name: "operationId" in operation ? operation.operationId : "",
            arguments: this.#generateArguments(operation),
            url: path,
            contentType: this.#extractContentType(operation.responses),
          };
        }

        return {};
      }) as Controller["functions"];
  }

  #generateArguments(
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
            name: camelCase(singular(parameter.name)),
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
            name: camelCase(
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
    newFunctions: Controller["functions"],
  ): Controller {
    const existingController = this.#controllerStore.get(controllerName)!;
    return {
      ...existingController,
      imports: this.#generateImports(
        existingController.functions,
        controllerName,
      ),
      functions: [
        ...(existingController.functions),
        ...newFunctions,
      ],
    };
  }

  #createNewController(
    controllerName: string,
    functions: Controller["functions"],
  ): Controller {
    return {
      name: controllerName,
      description: "",
      functions,
      imports: this.#generateImports(functions, controllerName),
    };
  }

  #generateImports(
    controllerFunctions: Controller["functions"],
    controllerName: string,
  ): Controller["imports"] {
    const allControllerImports =
      controllerFunctions.flatMap((controllerFunction) => {
        return controllerFunction.arguments?.body?.map((controllerBody) => ({
          path: `@/models/${pascalCase(singular(controllerBody.name))}`,
          name: `${pascalCase(singular(controllerBody.name))}`,
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
            path: `@/models/${pascalCase(singular(currentImport.name))}`,
            name: `${pascalCase(singular(currentImport.name))}`,
          });
        }
        return [...controllerImports, {
          name: NameBuilder({
            name: controllerName,
            kind: "className",
            type: "Service",
          }),
          path: `@/services/${
            pascalCase(singular(NameBuilder({
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
