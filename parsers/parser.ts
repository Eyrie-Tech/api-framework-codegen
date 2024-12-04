import type { OpenAPIV3 } from "openapi-types";

/**
 * A parser ingests an OpenAPI spec and stores these generations to stores
 */
export abstract class Parser {
  public abstract parse(
    file: OpenAPIV3.Document<Record<string | number | symbol, never>>,
  ): void;
}
