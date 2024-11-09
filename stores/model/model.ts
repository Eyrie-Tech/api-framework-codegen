import type { Model } from "../../types/model.d.ts";

export class ModelStore {
  #models: Map<string, Model> = new Map();

  public list() {
    return this.#models;
  }

  public get(modelName: string) {
    return this.#models.get(modelName);
  }

  public set(model: Model) {
    this.#models.set(model.name, model);
  }
}
