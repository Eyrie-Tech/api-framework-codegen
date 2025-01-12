import { IndentationText, Project, QuoteKind } from "ts-morph";
import type { Controller } from "../types/controller.d.ts";
import type { Model } from "../types/model.d.ts";
import type { Service } from "../types/service.d.ts";
import { ControllerBuilder } from "../builders/controller/controller_builder.ts";
import { ModelBuilder } from "../builders/model/model_builder.ts";
import { ServiceBuilder } from "../builders/service/service_builder.ts";
import { BootStrap } from "./builders/bootstrap/bootstrap.ts";

/**
 * The engine takes a parsed OpenAPI spec and delegates to the builders to construct the final project structure
 */
export class Engine {
  #project: Project;

  constructor() {
    this.#project = new Project({
      manipulationSettings: {
        indentationText: IndentationText.TwoSpaces,
        quoteKind: QuoteKind.Double,
        useTrailingCommas: true,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
      },
    });
  }

  public async process(
    models: Map<string, Model>,
    controllers: Map<string, Controller>,
    services: Map<string, Service>,
  ) {
    await Promise.all([
      ...Array.from(models.values()).map((model) =>
        new ModelBuilder(this.#project).build(model)
      ),
      ...Array.from(services.values()).map((service) =>
        new ServiceBuilder(this.#project).build(service)
      ),
      ...Array.from(controllers.values()).map((controller) =>
        new ControllerBuilder(this.#project).build(controller)
      ),
      [
        new BootStrap(this.#project).build(controllers.values().toArray()),
      ],
    ]);
  }
}
