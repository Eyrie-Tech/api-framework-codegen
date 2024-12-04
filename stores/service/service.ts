import type { Service } from "../../types/service.d.ts";

/**
 * Stores all servic defintions
 */
export class ServiceStore {
  #services: Map<string, Service> = new Map();

  public list() {
    return this.#services;
  }

  public get(serviceName: string) {
    return this.#services.get(serviceName);
  }

  public set(service: Service) {
    this.#services.set(service.name, service);
  }

  public has(serviceName: string): boolean {
    return this.#services.has(serviceName);
  }
}
