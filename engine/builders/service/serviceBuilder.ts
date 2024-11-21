import type { Project } from "npm:ts-morph";
import type { Service } from "../../../types/service.d.ts";
import { ClassNameBuilder } from "../../../utils/classNameBuilder.ts";
import { ExtensionBuilder } from "../../../utils/extensionBuilder.ts";
import { Builder } from "../builder.ts";

export class ServiceBuilder extends Builder implements Builder {
  #project: Project;

  constructor(project: Project) {
    super();
    this.#project = project;
  }

  public async build(service: Service) {
    const sourceFile = this.#project.createSourceFile(
      `lib/services/${ExtensionBuilder(service.name, "Service", "ts")}`,
      "",
      { overwrite: true },
    );

    sourceFile.addClass({
      isExported: true,
      name: ClassNameBuilder(service.name, "Service"),
      methods: service.functions.map((fn) => ({
        name: fn.name,
        parameters: this.buildFunctionParameters(fn.arguments),
      })),
    });

    await sourceFile.save();
  }
}
