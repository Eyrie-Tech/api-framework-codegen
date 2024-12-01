import type { Project } from "npm:ts-morph";
import type { Model } from "../../../types/model.d.ts";
import { NameBuilder } from "../../../utils/name_builder.ts";
import { Builder } from "../builder.ts";

/**
 * The model builder handles generating model definitions based off a parsed OpenAPI spec
 */
export class ModelBuilder extends Builder {
  #project: Project;

  constructor(project: Project) {
    super();
    this.#project = project;
  }

  /**
   * @param model A defined model definition used for the final generation
   */
  public async build(model: Model) {
    const sourceFile = this.#project.createSourceFile(
      `lib/models/${
        NameBuilder({
          name: model.name,
          type: undefined,
          extension: "ts",
          kind: "extension",
        })
      }`,
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
      name: NameBuilder({
        name: model.name,
        kind: "className",
      }),
      properties: model.fields.map((prop) => ({
        name: prop.name,
        type: prop.type,
        hasQuestionToken: prop.nullable,
      })),
    });

    await sourceFile.save();
  }
}
