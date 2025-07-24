import type {
  OptionalKind,
  ParameterDeclarationStructure,
  Project,
  SourceFile,
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
        {
          overwrite: false,
        },
      );

      sourceFile.addImportDeclarations([
        ...service.imports.map((serviceImport) => ({
          moduleSpecifier: `${serviceImport.path}.ts`,
          isTypeOnly: true,
          namedImports: [{ name: serviceImport.name }],
        })),
        {
          moduleSpecifier: "@eyrie/framework",
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
            this.#buildMethod(method, service.name)
          ),
          this.#buildRegisterMethod(service),
        ],
      });

      await sourceFile.save();
    } catch {
      this.#handlePostServiceUpdates(fileName, service);
    }
  }

  /**
   * Builds a method for the service class.
   * @param method The method definition.
   * @param serviceName The name of the service.
   */
  #buildMethod(
    method: Service["methods"][number],
    serviceName: string,
  ) {
    return {
      name: method.name,
      parameters: this.#buildRequestParamsWithContext(method.parameters?.body),
      statements:
        `// TODO: Implement ${method.name} method logic for ${serviceName}`,
    };
  }

  /**
   * Builds the register method for the service class.
   * @param service The service definition.
   */
  #buildRegisterMethod(service: Service) {
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
  #buildRequestParamsWithContext(
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

  /**
   * Adds a method to an already existing service. This method ensures service logic is not removed after generation
   * @param service The service we are generating this method for
   * @param existingMethods The methods that already exist on this service
   * @param existingSourceFile The existing service file to write changes too
   */
  #addMethodToExistingService(
    service: Service,
    existingMethods: string[],
    existingSourceFile: SourceFile | undefined,
  ) {
    service.methods.map((serviceMethod) => {
      if (!existingMethods.includes(serviceMethod.name)) {
        existingSourceFile?.getClass(NameBuilder({
          name: service.name,
          type: "Service",
          kind: "className",
        }))?.addMethod(
          this.#buildMethod(serviceMethod, service.name),
        );
      }
    });
  }

  /**
   * Removes a method on an already existing service. This method ensures service logic is tidied upon schema changes
   * @param service The service we are removing the method for
   * @param existingMethods The methods that already exist on this service
   * @param existingSourceFile The existing service file to write changes too
   */
  #removeMethodFromExistingService(
    service: Service,
    existingMethods: string[],
    existingSourceFile: SourceFile | undefined,
  ) {
    existingMethods.map((existingMethod) => {
      if (!service.methods.map((m) => m.name).includes(existingMethod)) {
        existingSourceFile?.getClass(NameBuilder({
          name: service.name,
          type: "Service",
          kind: "className",
        }))?.getMethod(existingMethod)?.remove();
      }
    });
  }

  /**
   * @param fileName The file to read current changes for
   * @param service The service to write changes too
   */
  async #handlePostServiceUpdates(fileName: string, service: Service) {
    this.#project.addSourceFileAtPath(`lib/services/${fileName}`);

    const existingSourceFile = this.#project.getSourceFile(
      `lib/services/${fileName}`,
    );

    const existingMethods: string[] = existingSourceFile?.getClasses()
      .flatMap((selectedClass) =>
        selectedClass.getMethods().map((selectedMethod) =>
          selectedMethod.getName()
        )
      )
      .filter((methodName) => methodName !== "register") as string[];

    this.#addMethodToExistingService(
      service,
      existingMethods,
      existingSourceFile,
    );

    this.#removeMethodFromExistingService(
      service,
      existingMethods,
      existingSourceFile,
    );

    await existingSourceFile?.save();
  }
}
