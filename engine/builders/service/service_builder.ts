import type { Project } from "npm:ts-morph";
import type { Service } from "../../../types/service.d.ts";
import { NameBuilder } from "../../../utils/name_builder.ts";
import { Builder } from "../builder.ts";

/**
 * The service builder handles generating service definitions based off a parsed OpenAPI spec
 */
export class ServiceBuilder extends Builder {
  #project: Project;

  constructor(project: Project) {
    super();
    this.#project = project;
  }

  /**
   * @param service A defined service definition used for the final generation
   */
  public async build(service: Service): Promise<void> {
    const sourceFile = this.#project.createSourceFile(
      `lib/services/${
        NameBuilder({
          name: service.name,
          type: "Service",
          extension: "ts",
          kind: "extension",
        })
      }`,
      "",
      { overwrite: true },
    );

    sourceFile.addClass({
      isExported: true,
      name: NameBuilder({
        name: service.name,
        type: "Service",
        kind: "className",
      }),
      methods: service.functions.map((fn) => ({
        name: fn.name,
        parameters: this.buildFunctionParameters(fn.arguments),
      })),
    });

    sourceFile.addImportDeclarations(service.imports.map((serviceImport) => ({
      moduleSpecifier: `${serviceImport.path}.ts`,
      isTypeOnly: true,
      namedImports: [{ name: serviceImport.name }],
    })));

    await sourceFile.save();
  }
}
