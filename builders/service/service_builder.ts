import type {
  OptionalKind,
  ParameterDeclarationStructure,
  Project,
} from "ts-morph";
import type { Service } from "../../types/service.d.ts";
import { NameBuilder } from "../../utils/name_builder.ts";
import { TSBuilder } from "../builder.ts";

/**
 * The service builder handles generating service definitions based off a parsed OpenAPI spec
 */
export class ServiceBuilder extends TSBuilder {
  #project: Project;

  constructor(project: Project) {
    super();
    this.#project = project;
  }

  /**
   * @param service A defined service definition used for the final generation
   */
  public async build(service: Service): Promise<void> {
    try {
      const sourceFile = this.#project.createSourceFile(
        `lib/services/${
          NameBuilder({
            name: service.name,
            type: "Service",
            extension: "ts",
            kind: "extension",
          })
        }`,
        "",
        { overwrite: false },
      );

      sourceFile.addClass({
        decorators: [{
          name: "Service()",
        }],
        isExported: true,
        name: NameBuilder({
          name: service.name,
          type: "Service",
          kind: "className",
        }),
        methods: [
          ...service.methods.map((method) => ({
            name: method.name,
            parameters: this.#buildRequestParamsWithContext(
              method.parameters?.body,
            ),
          })),
          {
            name: "register",
            parameters: [],
            returnType: "InjectableRegistration",
            statements: `return { dependencies: [${
              service.imports.filter((i) => i.name.endsWith("Service")).map((
                impor,
              ) => (`{class: ${impor.name}}`))
            }] }`,
          },
        ],
      });

      sourceFile.addImportDeclarations([
        ...service.imports.map((serviceImport) => ({
          moduleSpecifier: `${serviceImport.path}.ts`,
          isTypeOnly: true,
          namedImports: [{ name: serviceImport.name }],
        })),
        {
          moduleSpecifier: "@eyrie/app",
          namedImports: [
            {
              isTypeOnly: true,
              name: "InjectableRegistration",
            },
            {
              name: "Service",
            },
          ],
        },
      ]);

      await sourceFile.save();
    } catch {
      return;
    }
  }

  #buildRequestParamsWithContext(
    body: { name: string; type: string }[] | undefined,
  ): OptionalKind<ParameterDeclarationStructure>[] {
    if (body?.length) {
      return [{
        name: "context",
        type: "unknown",
      }, {
        name: "params",
        type: "unknown",
      }, {
        name: "body",
        type: body[0]?.type,
      }];
    }

    return [{
      name: "context",
      type: "unknown",
    }, {
      name: "params",
      type: "unknown",
    }];
  }
}
