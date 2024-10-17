import type { Controller } from "../../types/controller.d.ts";

export class ControllerStore {
  #controllers: Map<string, Controller> = new Map();

  public get() {
    return this.#controllers;
  }

  public set(controller: Controller) {
    this.#controllers.set(controller.name, controller);
  }
}
