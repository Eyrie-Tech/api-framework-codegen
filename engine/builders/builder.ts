import { toCamelCase } from "@std/text/to-camel-case";
import type { OptionalKind, ParameterDeclarationStructure } from "ts-morph";
import type { Controller } from "../../types/controller.d.ts";
import type { Model } from "../../types/model.d.ts";
import type { Service } from "../../types/service.d.ts";

/**
 * A builder takes in a constructed OpenAPI spec definition and perform the final output of the project structure
 */
export abstract class TSBuilder {
  public abstract build(
    resource: Controller | Service | Model,
  ): Promise<void>;

  protected buildMethodParameters(
    arg?: {
      params?: { name: string }[];
      body?: { name: string; type: string }[];
    },
  ): OptionalKind<ParameterDeclarationStructure>[] {
    if (arg?.params) {
      return arg?.params?.map((param) => ({
        name: param.name,
        type: "string",
      })) ?? [];
    }

    return arg?.body?.map((body) => ({
      name: body.name,
      type: body.type,
    })) ?? [];
  }

  protected buildConstructorParameters(
    classImports: Required<Controller>["imports"],
  ): OptionalKind<ParameterDeclarationStructure>[] {
    return classImports.filter((classImport) =>
      classImport.path.includes("@/services/")
    ).map((classImport) => ({
      name: toCamelCase(classImport.name),
      type: classImport.name,
      isReadonly: true,
    }));
  }
}
