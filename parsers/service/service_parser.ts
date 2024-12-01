import { camelCase, pascalCase } from "https://deno.land/x/case@2.2.0/mod.ts";
import { singular } from "https://deno.land/x/deno_plural@2.0.0/mod.ts";
import { Ajv, type ValidateFunction } from "npm:ajv";
import type { OpenAPIV3 } from "npm:openapi-types";
import serviceSchema from "../../schemas/service.json" with {
  type: "json",
};
import type { ServiceStore } from "../../stores/service/service.ts";
import type { Service } from "../../types/service.d.ts";
import { Parser } from "../parser.ts";

/**
 * The parser that outputs a service definition to be used by the service builder
 */
export class ServiceParser extends Parser {
  #ajv: Ajv = new Ajv();
  #validate: ValidateFunction<OpenAPIV3.Document>;
  #serviceStore: ServiceStore;

  constructor(serviceStore: ServiceStore) {
    super();
    this.#validate = this.#ajv.compile(serviceSchema);
    this.#serviceStore = serviceStore;
  }

  /**
   * Used to parse a provided OpenAPI spec and set the final outputs in the service store
   *
   * @param file Represents the resolved OpenAPI spec
   */
  public parse(file: OpenAPIV3.Document): void {
    Object.entries(file.paths).forEach(([path, pathItem]) => {
      if (pathItem) {
        const service = this.#compileService(pathItem, path);
        this.#validateAndStoreService(service);
      }
    });
  }

  #compileService(
    pathItem: OpenAPIV3.PathItemObject,
    path: string,
  ): Service {
    const functions = this.#compileFunctions(pathItem, path);
    const serviceName = pascalCase(
      singular(this.#extractServiceName(path)),
    );

    if (this.#serviceStore.has(serviceName)) {
      return this.#mergeWithExistingService(serviceName, functions);
    } else {
      return this.#createNewService(serviceName, functions);
    }
  }

  #compileFunctions(
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
            arguments: this.#generateArguments(operation),
            url: path,
            contentType: this.#extractContentType(operation.responses),
          };
        }

        return {};
      }) as Service["functions"];
  }

  #generateArguments(
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
      if (contentType && content?.[contentType]) {
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

  #extractServiceName(path: string): string {
    return path.split("/")[1] || "";
  }

  #mergeWithExistingService(
    serviceName: string,
    newFunctions: Service["functions"],
  ): Service {
    const existingService = this.#serviceStore.get(serviceName)!;
    return {
      ...existingService,
      imports: this.#generateImports(existingService.functions),
      functions: [
        ...(existingService.functions),
        ...newFunctions,
      ],
    };
  }

  #createNewService(
    serviceName: string,
    functions: Service["functions"],
  ): Service {
    return {
      name: serviceName,
      description: "",
      functions,
      imports: this.#generateImports(functions),
    };
  }

  #generateImports(serviceFunctions: Service["functions"]): Service["imports"] {
    const allServiceImports = serviceFunctions.flatMap((serviceFunction) => {
      return serviceFunction.arguments?.body?.map((serviceBody) => ({
        path: `@/models/${pascalCase(singular(serviceBody.name))}`,
        name: `${pascalCase(singular(serviceBody.name))}`,
      })) || [];
    }) || [];

    return allServiceImports.reduce(
      (serviceImports: Service["imports"], currentImport) => {
        if (
          serviceImports.find((serviceImport) =>
            serviceImport.name === currentImport.name
          )
        ) {
          return serviceImports;
        } else {
          serviceImports.push({
            path: `@/models/${pascalCase(singular(currentImport.name))}`,
            name: `${pascalCase(singular(currentImport.name))}`,
          });
        }
        return serviceImports;
      },
      [],
    );
  }

  #validateAndStoreService(service: Service): void {
    if (!this.#validate(service)) {
      throw new Error(
        `Schema validation failed for service: ${service.name}`,
        { cause: this.#validate.errors },
      );
    }
    this.#serviceStore.set(service);
  }
}
