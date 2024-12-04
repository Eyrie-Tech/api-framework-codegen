import type { Controller } from "../../types/controller.d.ts";

/**
 * Stores all controller defintions
 */
export class ControllerStore {
  #controllers: Map<string, Controller> = new Map();

  public list() {
    return this.#controllers;
  }

  public get(controllerName: string) {
    return this.#controllers.get(controllerName);
  }

  public set(controller: Controller) {
    this.#controllers.set(controller.name, controller);
  }

  public has(controllerName: string): boolean {
    return this.#controllers.has(controllerName);
  }
}
