import type { Model } from "../../types/model.d.ts";

export class ModelStore {
  #models: Map<string, Model> = new Map();

  public get() {
    return this.#models;
  }

  public set(model: Model) {
    this.#models.set(model.name, model);
  }
}
