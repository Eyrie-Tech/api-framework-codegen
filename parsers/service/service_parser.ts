import { toCamelCase, toPascalCase } from "@std/text";
import { Ajv, type ValidateFunction } from "ajv";
import { singular } from "https://deno.land/x/deno_plural@2.0.0/mod.ts";
import type { OpenAPIV3 } from "openapi-types";
import serviceSchema from "../../schemas/service.json" with {
  type: "json",
};
import type { Store } from "../../stores/store.ts";
import type { Service } from "../../types/service.d.ts";
import { Parser } from "../parser.ts";

/**
 * The parser that outputs a service definition to be used by the service builder
 */
export class ServiceParser extends Parser {
  #ajv: Ajv = new Ajv();
  #validate: ValidateFunction<OpenAPIV3.Document>;
  #serviceStore: Store<Service>;

  constructor(serviceStore: Store<Service>) {
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
    const methods = this.#compileMethods(pathItem, path);
    const serviceName = toPascalCase(
      singular(this.#extractServiceName(path)),
    );

    if (this.#serviceStore.has(serviceName)) {
      return this.#mergeWithExistingService(serviceName, methods);
    } else {
      return this.#createNewService(serviceName, methods);
    }
  }

  #compileMethods(
    pathItem: OpenAPIV3.PathItemObject,
    path: string,
  ): Service["methods"] {
    return Object.entries(pathItem)
      .filter(([method]) =>
        ["get", "post", "put", "delete", "patch"].includes(method)
      )
      .map(([method, operation]) => {
        if (typeof operation === "object" && "operationId" in operation) {
          // TODO: evaluate this validation
          // assert(singular(path) === path, `${path} cannot be plural`);
          return {
            type: method,
            name: "operationId" in operation ? operation.operationId : "",
            parameters: this.#generateParameters(operation),
            url: path,
            contentType: this.#extractContentType(operation.responses),
          };
        }

        return {};
      }) as Service["methods"];
  }

  #generateParameters(
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
      if (contentType && content?.[contentType]) {
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

  #extractServiceName(path: string): string {
    return path.split("/")[1] || "";
  }

  #mergeWithExistingService(
    serviceName: string,
    newMethods: Service["methods"],
  ): Service {
    const existingService = this.#serviceStore.get(serviceName)!;
    return {
      ...existingService,
      imports: this.#generateImports(existingService.methods),
      methods: [
        ...(existingService.methods),
        ...newMethods,
      ],
    };
  }

  #createNewService(
    serviceName: string,
    methods: Service["methods"],
  ): Service {
    return {
      name: serviceName,
      description: "",
      methods,
      imports: this.#generateImports(methods),
    };
  }

  #generateImports(serviceMethods: Service["methods"]): Service["imports"] {
    const allServiceImports = serviceMethods.flatMap((serviceMethod) => {
      return serviceMethod.parameters?.body?.map((serviceBody) => ({
        path: `@/models/${toPascalCase(singular(serviceBody.name))}`,
        name: `${toPascalCase(singular(serviceBody.name))}`,
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
            path: `@/models/${toPascalCase(singular(currentImport.name))}`,
            name: `${toPascalCase(singular(currentImport.name))}`,
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
