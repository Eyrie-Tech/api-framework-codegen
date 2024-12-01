import type { Project } from "npm:ts-morph";
import type { Controller } from "../../../types/controller.d.ts";
import { NameBuilder } from "../../../utils/name_builder.ts";
import { Builder } from "../builder.ts";

/**
 * The controller builder handles generating controller definitions based off a parsed OpenAPI spec
 */
export class ControllerBuilder extends Builder {
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
      controller.imports.map((controllerImport) => ({
        moduleSpecifier: `${controllerImport.path}.ts`,
        isTypeOnly: true,
        namedImports: [{ name: controllerImport.name }],
      })),
    );

    sourceFile.addClass({
      isExported: true,
      name: NameBuilder({
        name: controller.name,
        type: "Controller",
        kind: "className",
      }),
      ctors: [{
        parameters: this.buildConstructorParameters(controller.imports),
      }],
      methods: controller.functions.map((fn) => ({
        name: fn.name || "",
        parameters: this.buildFunctionParameters(fn.arguments),
      })),
    });

    await sourceFile.save();
  }
}
