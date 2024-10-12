import { toPascalCase } from "@std/text";
import pluralise from "npm:pluralize";
import {
  type ClassDeclaration,
  type OptionalKind,
  type ParameterDeclarationStructure,
  Project,
  Scope,
  type SourceFile,
} from "npm:ts-morph";
import type { DefResponse, Spec } from "../types.ts";

export class Engine {
  #project: Project = new Project();

  public async process(fileJson: Spec) {
    const controllers: { [key: string]: SourceFile } = {};

    for (const path in fileJson.paths) {
      const controllerName = this.#buildControllerNameFromPath(path);

      if (!controllers[controllerName]) {
        controllers[controllerName] = this.#project.createSourceFile(
          `${controllerName}.ts`,
          `export class ${controllerName} {}`,
          { overwrite: true },
        );
      }

      for (const method in fileJson.paths[path]) {
        this.#constructParts({
          definition: fileJson.paths[path][method],
          ndf: controllers[controllerName].getClass(controllerName),
        });
      }
    }

    await this.#project.save();
  }

  #buildParameters(
    definition: DefResponse,
  ): OptionalKind<ParameterDeclarationStructure>[] | undefined {
    const parameters = definition.parameters?.map((parameter) => ({
      name: parameter.name,
      type: parameter.schema?.type,
    }));

    const schema = definition?.requestBody?.content
      ?.["application/json"]["schema"];

    if (schema) {
      parameters?.push({
        name: "body",
        type: "string",
      });
    }

    return parameters;
  }

  #constructParts({ definition, ndf }: {
    ndf: ClassDeclaration | undefined;
    definition?: DefResponse | undefined;
  }) {
    if (!definition) return;

    ndf?.addMethod({
      name: definition.operationId,
      parameters: this.#buildParameters(definition),
      scope: Scope.Public,
    });
  }

  #buildControllerNameFromPath(path: string) {
    const [, name] = path.split("/");

    return `${pluralise.singular(toPascalCase(name || ""))}Controller`;
  }
}
