import {
  IndentationText,
  type OptionalKind,
  type ParameterDeclarationStructure,
  Project,
} from "npm:ts-morph";
import type { Controller } from "../../types/controller.d.ts";
import type { Model } from "../../types/model.d.ts";
import type { Service } from "../../types/service.d.ts";
import { ExtensionBuilder } from "../../utils/extensionBuilder.ts";

export class Engine {
  #project: Project = new Project({
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
    },
  });

  public async process(
    models: Map<string, Model>,
    controllers: Map<string, Controller>,
    services: Map<string, Service>,
  ) {
    await this.#project.createDirectory("lib").save();
    await this.#project.createDirectory("lib/controllers").save();
    await this.#project.createDirectory("lib/services").save();

    for (const [_, value] of models.entries()) {
      const path = "lib/models/";
      const sourceFile = this.#project.createSourceFile(
        path + ExtensionBuilder(value.name, "Model", "ts"),
        "",
        { overwrite: true },
      );

      sourceFile.addInterface({
        isExported: true,
        name: value.name + "Model", // TODO: Set this higher up
        properties: value.fields.map((prop) => ({
          name: prop.name,
          type: prop.type === "enum"
            ? prop.enumValues?.toString().split(",").map((v) => `"${v}"`).join(
              " | ",
            )
            : prop.type,
        })),
      });
      await sourceFile.save();
    }

    for (const [_, value] of services.entries()) {
      const path = "lib/services/";
      const sourceFile = this.#project.createSourceFile(
        path + ExtensionBuilder(value.name, "Service", "ts"),
        "",
        { overwrite: true },
      );

      sourceFile.addClass({
        isExported: true,
        name: value.name + "Service", // TODO: Set this higher up
        methods: value.functions.map((fn) => ({
          name: fn.name || "",
          parameters: this.#buildFunctionParameters(fn.arguments),
        })),
      });
      await sourceFile.save();
    }

    for (const [_, value] of controllers.entries()) {
      const path = "lib/controllers/";
      const sourceFile = this.#project.createSourceFile(
        path + ExtensionBuilder(value.name, "Controller", "ts"),
        "",
        { overwrite: true },
      );

      value.imports.map((classImport) => {
        sourceFile.addImportDeclarations([{
          moduleSpecifier: classImport.path + ".ts",
          isTypeOnly: true,
          namedImports: [{
            name: classImport.name,
          }],
        }]);
      });

      sourceFile.addClass({
        ctors: [{
          parameters: this.#buildConstructorParameters(value.imports),
        }],
        isExported: true,
        name: value.name + "Controller", // TODO: Set this higher up
        methods: value.functions.map((fn) => ({
          name: fn.name || "",
          parameters: this.#buildFunctionParameters(fn.arguments),
        })),
      });
      await sourceFile.save();
    }
  }

  #buildFunctionParameters(
    arg: Required<Controller | Service>["functions"][number]["arguments"],
  ): OptionalKind<ParameterDeclarationStructure>[] | undefined {
    return arg?.params?.map<
      OptionalKind<ParameterDeclarationStructure>
    >((param) => ({
      name: param.name,
      type: "string",
    }));
  }

  #buildConstructorParameters(
    classImports: Required<Controller>["imports"],
  ): OptionalKind<ParameterDeclarationStructure>[] | undefined {
    return classImports.map<
      OptionalKind<ParameterDeclarationStructure>
    >((classImport) => ({
      name: classImport.name,
      type: classImport.name,
    }));
  }
}
