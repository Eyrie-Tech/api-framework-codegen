import { Project } from "npm:ts-morph";
import type { Controller } from "../../types/controller.d.ts";
import type { Model } from "../../types/model.d.ts";
import type { Service } from "../../types/service.d.ts";

export class Engine {
  #project: Project = new Project();

  public async process(
    _models: Map<string, Model>,
    controllers: Map<string, Controller>,
    _services: Map<string, Service>,
  ) {
    for (const [_, value] of controllers.entries()) {
      const sourceFile = this.#project.createSourceFile(value.name);
      sourceFile.addClass({
        name: value.name,
        methods: value.functions.map((fn) => ({
          name: fn.name || "",
        })),
      });
      await sourceFile.save();
    }
  }
}
