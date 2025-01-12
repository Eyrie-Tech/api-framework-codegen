import type { Project } from "ts-morph";
import type { Controller } from "../../../types/controller.d.ts";
import { NameBuilder } from "../../../utils/name_builder.ts";
import { TSBuilder } from "../builder.ts";

export class BootStrap extends TSBuilder {
  #project: Project;

  constructor(project: Project) {
    super();
    this.#project = project;
  }

  /**
   * Builds the main application bootstrap file with the required controllers and configurations.
   */
  public async build(controllers: Controller[]): Promise<void> {
    const sourceFile = this.#project.createSourceFile(
      "lib/main.ts",
      "",
      { overwrite: true },
    );

    sourceFile.addImportDeclarations([
      {
        namedImports: [{ name: "Application" }],
        moduleSpecifier: "@eyrie/app",
      },
      ...controllers.map((controller) => ({
        namedImports: [{
          name: NameBuilder({
            kind: "className",
            name: controller.name,
            type: "Controller",
          }),
        }],
        moduleSpecifier: `./controllers/${
          NameBuilder({
            kind: "extension",
            extension: "ts",
            name: controller.name,
            type: "Controller",
          })
        }`,
      })),
    ]);

    sourceFile.addStatements(`
const app = new Application();

app.registerVersion({
  version: "v1",
  controllers: [${
      controllers.map((controller) =>
        NameBuilder({
          type: "Controller",
          kind: "className",
          name: controller.name,
        })
      )
    }],
});

await app.listen();
`);

    await sourceFile.save();
  }
}
