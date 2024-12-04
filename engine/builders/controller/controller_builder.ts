import type { Project } from "ts-morph";
import type { Controller } from "../../../types/controller.d.ts";
import { NameBuilder } from "../../../utils/name_builder.ts";
import { TSBuilder } from "../builder.ts";

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
      methods: controller.methods.map((method) => ({
        name: method.name || "",
        parameters: this.buildMethodParameters(method.parameters),
      })),
    });

    await sourceFile.save();
  }
}
