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

export class ControllerParser extends Parser {
  #ajv: Ajv = new Ajv();
  #validate: ValidateFunction<OpenAPIV3.Document>;
  #controllerStore: ControllerStore;

  constructor(controllerStore: ControllerStore) {
    super();
    this.#validate = this.#ajv.compile(controllerSchema);
    this.#controllerStore = controllerStore;
  }

  public parse(file: OpenAPIV3.Document): void {
    Object.entries(file.paths).forEach(([path, pathItem]) => {
      if (pathItem) {
        const controller = this.compileController(pathItem, path);
        this.validateAndStoreController(controller);
      }
    });
  }

  private compileController(
    pathItem: OpenAPIV3.PathItemObject,
    path: string,
  ): Controller {
    const functions = this.compileFunctions(pathItem, path);
    const controllerName = pascalCase(
      singular(this.extractControllerName(path)),
    );

    if (this.#controllerStore.has(controllerName)) {
      return this.mergeWithExistingController(controllerName, functions);
    } else {
      return this.createNewController(controllerName, functions);
    }
  }

  private compileFunctions(
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
            arguments: this.generateArguments(operation),
            url: path,
            contentType: this.extractContentType(operation.responses),
          };
        }

        return {};
      });
  }

  private generateArguments(
    operation: OpenAPIV3.OperationObject,
  ): {
    params?: unknown[];
    body?: { name?: string | undefined; type?: string | undefined }[];
  } {
    const args: {
      params?: unknown[];
      body?: { name?: string | undefined; type?: string | undefined }[];
    } = {};

    if (operation.parameters) {
      args.params = operation.parameters.map((parameter) => {
        if ("name" in parameter) {
          // deno-lint-ignore no-unused-vars
          const { schema, ...rest } = parameter;
          return rest;
        }
      });
    }

    if (operation.requestBody) {
      const content =
        (operation.requestBody as OpenAPIV3.RequestBodyObject).content;
      const contentType = Object.keys(content)[0];
      if (contentType && content?.[contentType]) {
        const schema = content[contentType].schema as OpenAPIV3.ReferenceObject;
        if (schema.$ref) {
          args.body = [{
            name: schema.$ref.split("/").pop(),
            type: `${schema.$ref.split("/").pop()}Model`,
          }];
        }
      }
    }

    return args;
  }

  private extractContentType(
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

  private extractControllerName(path: string): string {
    return path.split("/")[1] || "";
  }

  private mergeWithExistingController(
    controllerName: string,
    newFunctions: Controller["functions"],
  ): Controller {
    const existingController = this.#controllerStore.get(controllerName)!;
    return {
      ...existingController,
      functions: [
        ...(existingController.functions),
        ...newFunctions,
      ],
    };
  }

  private createNewController(
    controllerName: string,
    functions: Controller["functions"],
  ): Controller {
    return {
      name: controllerName,
      description: "",
      functions,
      imports: [{
        path: `@/services/${pascalCase(singular(controllerName))}Service`,
      }, { path: `@/models/${pascalCase(singular(controllerName))}Model` }],
    };
  }

  private validateAndStoreController(controller: Controller): void {
    if (!this.#validate(controller)) {
      throw new Error(
        `Schema validation failed for controller: ${controller.name}`,
      );
    }
    this.#controllerStore.set(controller);
  }
}
