import type { Project } from "ts-morph";
import type { Controller } from "../../types/controller.d.ts";
import { NameBuilder } from "../../utils/name_builder.ts";
import { TSBuilder } from "../builder.ts";
import { toPascalCase } from "@std/text/to-pascal-case";
/**
 * The controller builder handles generating controller definitions based off a parsed OpenAPI spec
 */
export class ControllerBuilder extends TSBuilder {
  #project: Project;

  constructor(project: Project) {
    super();
    this.#project = project;
  }

  /**
   * @param controller A defined controller definition used for the final generation
   */
  public async build(controller: Controller) {
    const sourceFile = this.#project.createSourceFile(
      `lib/controllers/${
        NameBuilder({
          name: controller.name,
          type: "Controller",
          extension: "ts",
          kind: "extension",
        })
      }`,
      "",
      { overwrite: true },
    );

    sourceFile.addImportDeclarations(
      [
        ...controller.imports.map((controllerImport) => ({
          moduleSpecifier: `${controllerImport.path}.ts`,
          namedImports: [{ name: controllerImport.name }],
        })),
        {
          moduleSpecifier: "@eyrie/app",
          namedImports: [
            { name: "Controller" },
            {
              name: "InjectableRegistration",
              isTypeOnly: true,
            },
            {
              name: "Context",
              isTypeOnly: true,
            },
            { name: "Get" },
            { name: "Post" },
          ],
        },
      ],
    );

    sourceFile.addClass({
      isExported: true,
      decorators: [{
        arguments: [`"/${controller.name}"`],
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
        ...controller.methods.map((method) => ({
          name: method.name || "",
          statements:
            `return this.${controller.name.toLowerCase()}Service.${method.name}(${
              this.#buildRequestParamsWithContext(method.parameters?.body)
            })`,
          parameters: [
            {
              name: "context",
              type: "Context",
            },
            ...this.addMethodParams(),
            ...this.addMethodBody(method.parameters?.body),
          ],
          decorators: [{
            name: toPascalCase(method.type),
            arguments: [
              // TODO: Refactor this
              `{description: '', path: "${
                method.url.split(`/${controller.name.toLowerCase()}`).pop()
                    ?.toString() === ""
                  ? "/"
                  : method.url.split(`/${controller.name.toLowerCase()}`).pop()
                    ?.toString()
              }"}`,
            ],
          }],
        })),
        {
          name: "register",
          parameters: [],
          returnType: "InjectableRegistration",
          statements: `return { dependencies: [${
            controller.imports.filter((i) => i.name.endsWith("Service")).map((
              impor,
            ) => (`{class: ${impor.name}}`))
          }] }`,
        },
      ],
    });

    await sourceFile.save();
  }

  #buildRequestParamsWithContext(body: unknown) {
    if (body) return "context, params, body";

    return "context, params";
  }

  private addMethodBody(body?: { name: string; type: string }[]) {
    if (body?.length) {
      return [{
        name: "body",
        type: body[0]?.type,
      }];
    }
    return [];
  }

  private addMethodParams() {
    return [{
      name: "params",
      type: "unknown",
    }];
  }
}
