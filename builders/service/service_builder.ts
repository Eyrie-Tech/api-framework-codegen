import type {
  OptionalKind,
  ParameterDeclarationStructure,
  Project,
} from "ts-morph";
import type { Service } from "../../types/service.d.ts";
import { NameBuilder } from "../../utils/name_builder.ts";
import { TSBuilder } from "../builder.ts";

/**
 * The ServiceBuilder class generates service definitions based on a parsed OpenAPI spec.
 */
export class ServiceBuilder extends TSBuilder {
  #project: Project;

  constructor(project: Project) {
    super();
    this.#project = project;
  }

  /**
   * Builds a service source file based on the provided service definition.
   * @param service A defined service used for the final generation.
   */
  public async build(service: Service): Promise<void> {
    const fileName = NameBuilder({
      name: service.name,
      type: "Service",
      extension: "ts",
      kind: "extension",
    });

    try {
      const sourceFile = this.#project.createSourceFile(
        `lib/services/${fileName}`,
        "",
        { overwrite: false },
      );

      sourceFile.addImportDeclarations([
        ...service.imports.map((serviceImport) => ({
          moduleSpecifier: `${serviceImport.path}.ts`,
          isTypeOnly: true,
          namedImports: [{ name: serviceImport.name }],
        })),
        {
          moduleSpecifier: "@eyrie/app",
          namedImports: [
            { name: "Service" },
            { name: "InjectableRegistration", isTypeOnly: true },
          ],
        },
      ]);

      sourceFile.addClass({
        decorators: [{ name: "Service()" }],
        isExported: true,
        name: NameBuilder({
          name: service.name,
          type: "Service",
          kind: "className",
        }),
        methods: [
          ...service.methods.map((method) =>
            this.buildMethod(method, service.name)
          ),
          this.buildRegisterMethod(service),
        ],
      });

      await sourceFile.save();
    } catch {
      console.info(`${service.name} already exists, skipping...`);
    }
  }

  /**
   * Builds a method for the service class.
   * @param method The method definition.
   * @param serviceName The name of the service.
   */
  private buildMethod(
    method: Service["methods"][number],
    serviceName: string,
  ) {
    return {
      name: method.name,
      parameters: this.buildRequestParamsWithContext(method.parameters?.body),
      statements:
        `// TODO: Implement ${method.name} method logic for ${serviceName}`,
    };
  }

  /**
   * Builds the register method for the service class.
   * @param service The service definition.
   */
  private buildRegisterMethod(service: Service) {
    const dependencies = service.imports
      .filter((i) => i.name.endsWith("Service"))
      .map((impor) => `{ class: ${impor.name} }`)
      .join(", ");

    return {
      name: "register",
      parameters: [],
      returnType: "InjectableRegistration",
      statements: `return { dependencies: [${dependencies}] };`,
    };
  }

  /**
   * Constructs the request parameters including context, params, and optionally body.
   * @param body The body parameter.
   */
  private buildRequestParamsWithContext(
    body: { name: string; type: string }[] | undefined,
  ): OptionalKind<ParameterDeclarationStructure>[] {
    const params = [
      { name: "context", type: "unknown" },
      { name: "params", type: "unknown" },
    ];

    if (body?.length && body[0]) {
      params.push({ name: "body", type: body[0].type });
    }

    return params;
  }
}
