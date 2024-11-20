import { pascalCase } from "https://deno.land/x/case@2.2.0/mod.ts";
import { singular } from "https://deno.land/x/deno_plural@2.0.0/mod.ts";
import { Ajv, type ValidateFunction } from "npm:ajv";
import type { OpenAPIV3 } from "npm:openapi-types";
import serviceSchema from "../../schemas/service.json" with {
  type: "json",
};
import type { ServiceStore } from "../../stores/service/service.ts";
import type { Service } from "../../types/service.d.ts";
import { Parser } from "../parser.ts";

export class ServiceParser extends Parser {
  #ajv: Ajv = new Ajv();
  #validate: ValidateFunction<OpenAPIV3.Document>;
  #serviceStore: ServiceStore;

  constructor(serviceStore: ServiceStore) {
    super();
    this.#validate = this.#ajv.compile(serviceSchema);
    this.#serviceStore = serviceStore;
  }

  public parse(file: OpenAPIV3.Document): void {
    Object.entries(file.paths).forEach(([path, pathItem]) => {
      if (pathItem) {
        const service = this.compileService(pathItem, path);
        this.validateAndStoreService(service);
      }
    });
  }

  private compileService(
    pathItem: OpenAPIV3.PathItemObject,
    path: string,
  ): Service {
    const functions = this.compileFunctions(pathItem, path);
    const serviceName = pascalCase(
      singular(this.extractServiceName(path)),
    );

    if (this.#serviceStore.has(serviceName)) {
      return this.mergeWithExistingService(serviceName, functions);
    } else {
      return this.createNewService(serviceName, functions);
    }
  }

  private compileFunctions(
    pathItem: OpenAPIV3.PathItemObject,
    path: string,
  ): Service["functions"] {
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
      }) as Service["functions"];
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

  private extractServiceName(path: string): string {
    return path.split("/")[1] || "";
  }

  private mergeWithExistingService(
    serviceName: string,
    newFunctions: Service["functions"],
  ): Service {
    const existingService = this.#serviceStore.get(serviceName)!;
    return {
      ...existingService,
      functions: [
        ...(existingService.functions),
        ...newFunctions,
      ],
    };
  }

  private createNewService(
    serviceName: string,
    functions: Service["functions"],
  ): Service {
    return {
      name: serviceName,
      description: "",
      functions,
      imports: [{
        path: `@/models/${pascalCase(singular(serviceName))}Model`,
      }],
    };
  }

  private validateAndStoreService(service: Service): void {
    if (!this.#validate(service)) {
      throw new Error(
        `Schema validation failed for service: ${service.name}`,
      );
    }
    this.#serviceStore.set(service);
  }
}
