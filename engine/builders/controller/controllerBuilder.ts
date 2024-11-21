import type { Project } from "npm:ts-morph";
import type { Controller } from "../../../types/controller.d.ts";
import { ClassNameBuilder } from "../../../utils/classNameBuilder.ts";
import { ExtensionBuilder } from "../../../utils/extensionBuilder.ts";
import { Builder } from "../builder.ts";

export class ControllerBuilder extends Builder implements Builder {
  #project: Project;

  constructor(project: Project) {
    super();
    this.#project = project;
  }

  public async build(controller: Controller) {
    const sourceFile = this.#project.createSourceFile(
      `lib/controllers/${
        ExtensionBuilder(controller.name, "Controller", "ts")
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
      name: ClassNameBuilder(controller.name, "Controller"),
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
