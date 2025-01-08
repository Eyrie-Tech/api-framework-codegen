import type { Project } from "ts-morph";
import { TSBuilder } from "../builder.ts";

export class BootStrap extends TSBuilder {
  #project: Project;

  constructor(project: Project) {
    super();
    this.#project = project;
  }

  /**
   * @param controller A bootstrap of the final application and all of it's related controllers
   */
  public async build() {
    const sourceFile = this.#project.createSourceFile(
      `lib/main.ts`,
      "",
      { overwrite: true },
    );

    sourceFile.addImportDeclarations(
      [
        {
          namedImports: [{ name: "Application" }],
          moduleSpecifier: "@eyrie/app",
        },
        {
          namedImports: [{ name: "PetController" }],
          moduleSpecifier: "./controllers/PetController.ts",
        },
      ],
    );

    sourceFile.addStatements(`
const app = new Application();

app.registerVersion({
  version: "v1",
  controllers: [PetController],
});

await app.listen();
`);

    await sourceFile.save();
  }
}
