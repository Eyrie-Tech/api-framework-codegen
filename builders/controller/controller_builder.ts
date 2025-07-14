import type { Project } from "ts-morph";
import type { Controller } from "../../types/controller.d.ts";
import { NameBuilder } from "../../utils/name_builder.ts";
import { TSBuilder } from "../builder.ts";

/**
 * The ControllerBuilder class generates controller definitions based on a parsed OpenAPI spec.
 */
export class ControllerBuilder extends TSBuilder {
  #project: Project;

  constructor(project: Project) {
    super();
    this.#project = project;
  }

  /**
   * Builds a controller source file based on the provided controller definition.
   * @param controller A defined controller used for the final generation.
   */
  public async build(controller: Controller): Promise<void> {
    const fileName = NameBuilder({
      name: controller.name,
      type: "Controller",
      extension: "ts",
      kind: "extension",
    });

    const sourceFile = this.#project.createSourceFile(
      `lib/controllers/${fileName}`,
      "",
      { overwrite: true },
    );

    sourceFile.addImportDeclarations([
      ...controller.imports.map((controllerImport) => ({
        moduleSpecifier: `${controllerImport.path}.ts`,
        namedImports: [{
          name: controllerImport.name,
        }],
        isTypeOnly: controllerImport.path.includes("@/models"),
      })),
      {
        moduleSpecifier: "@eyrie/app",
        namedImports: [
          { name: "Controller" },
          { name: "InjectableRegistration", isTypeOnly: true },
          { name: "Context", isTypeOnly: true },
          ...new Set(
            controller.methods.map((method) => method.type),
          ),
        ],
      },
    ]);

    sourceFile.addClass({
      isExported: true,
      decorators: [{
        arguments: [`"${controller.path}"`],
        name: "Controller",
      }],
      name: NameBuilder({
        name: controller.name,
        type: "Controller",
        kind: "className",
      }),
      ctors: [{
        parameters: this.buildConstructorParameters(controller.imports),
      }],
      methods: [
        ...controller.methods.map((method) =>
          this.#buildMethod(controller, method)
        ),
        {
          name: "register",
          parameters: [],
          returnType: "InjectableRegistration",
          statements: `return { dependencies: [${
            controller.imports
              .filter((impor) => impor.name.endsWith("Service"))
              .map((impor) => `{ class: ${impor.name} }`)
              .join(", ")
          }] };`,
        },
      ],
    });

    await sourceFile.save();
  }

  /**
   * Builds a method for the controller class.
   * @param controller The controller definition.
   * @param method The method definition.
   */
  #buildMethod(
    controller: Controller,
    method: Controller["methods"][number],
  ) {
    const methodName = method.name || "";
    const path = method.url;

    return {
      name: methodName,
      statements:
        `return this.${controller.name.toLowerCase()}Service.${methodName}(${
          this.#buildRequestParamsWithContext(method.parameters?.body)
        })`,
      parameters: [
        { name: "context", type: "Context" },
        ...this.#addMethodParams(),
        ...this.#addMethodBody(method.parameters?.body),
      ],
      decorators: [{
        name: method.type,
        arguments: [`{ description: '', path: "${path}" }`],
      }],
    };
  }

  /**
   * Constructs the request parameters including context, params, and optionally body.
   * @param body The body parameter.
   */
  #buildRequestParamsWithContext(body: unknown): string {
    return body ? "context, params, body" : "context, params";
  }

  /**
   * Adds body parameter to the method if it exists.
   * @param body The body parameter definition.
   */
  #addMethodBody(
    body?: { name: string; type: string }[],
  ): { name: string; type: string }[] {
    if (body?.length && body[0]) {
      return [{ name: "body", type: body[0].type }];
    }
    return [];
  }

  /**
   * Adds params parameter to the method.
   */
  #addMethodParams(): { name: string; type: string }[] {
    return [{ name: "params", type: "unknown" }];
  }
}
