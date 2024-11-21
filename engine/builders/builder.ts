import type { OptionalKind, ParameterDeclarationStructure } from "npm:ts-morph";
import type { Controller } from "../../types/controller.d.ts";
import type { Model } from "../../types/model.d.ts";
import type { Service } from "../../types/service.d.ts";

export abstract class Builder {
  public abstract build(
    resource: Controller | Service | Model,
  ): Promise<void>;

  protected buildFunctionParameters(
    arg?: { params?: { name: string }[] },
  ): OptionalKind<ParameterDeclarationStructure>[] {
    return arg?.params?.map((param) => ({
      name: param.name,
      type: "string",
    })) ?? [];
  }

  protected buildConstructorParameters(
    classImports: Required<Controller>["imports"],
  ): OptionalKind<ParameterDeclarationStructure>[] {
    return classImports.map((classImport) => ({
      name: classImport.name,
      type: classImport.name,
    }));
  }
}
