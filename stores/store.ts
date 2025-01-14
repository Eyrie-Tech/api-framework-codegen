/**
 * A generic store implementation for controllers, services and models
 */
export class Store<T extends { name: string }> {
  #resources: Map<string, T> = new Map();

  public list() {
    return this.#resources;
  }

  public get(resourceName: string) {
    return this.#resources.get(resourceName);
  }

  public set(resource: T) {
    this.#resources.set(resource.name, resource);
  }

  public has(resourceName: string): boolean {
    return this.#resources.has(resourceName);
  }
}
