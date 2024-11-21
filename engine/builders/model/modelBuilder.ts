import type { Project } from "npm:ts-morph";
import type { Model } from "../../../types/model.d.ts";
import { ClassNameBuilder } from "../../../utils/classNameBuilder.ts";
import { ExtensionBuilder } from "../../../utils/extensionBuilder.ts";
import { Builder } from "../builder.ts";

export class ModelBuilder extends Builder implements Builder {
  #project: Project;

  constructor(project: Project) {
    super();
    this.#project = project;
  }

  public async build(model: Model) {
    const sourceFile = this.#project.createSourceFile(
      `lib/models/${ExtensionBuilder(model.name, undefined, "ts")}`,
      "",
      { overwrite: true },
    );

    sourceFile.addImportDeclarations(model.imports.map((modelImport) => ({
      moduleSpecifier: `${modelImport.path}.ts`,
      isTypeOnly: true,
      namedImports: [{ name: modelImport.name }],
    })));

    sourceFile.addInterface({
      isExported: true,
      name: ClassNameBuilder(model.name),
      properties: model.fields.map((prop) => ({
        name: prop.name,
        type: prop.type,
        hasQuestionToken: prop.nullable,
      })),
    });

    await sourceFile.save();
  }
}
