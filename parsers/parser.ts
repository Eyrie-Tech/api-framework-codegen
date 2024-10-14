import type { OpenAPIV3 } from "npm:openapi-types";

export abstract class Parser {
  public abstract parse(
    file: OpenAPIV3.Document<Record<string | number | symbol, never>>,
  ): void;
}
