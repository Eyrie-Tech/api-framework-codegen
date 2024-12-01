type Extension = {
  kind: "extension";
  extension: string;
  name: string;
  type?: "Controller" | "Service" | undefined;
};

type ClassName = {
  kind: "className";
  name: string;
  type?: "Controller" | "Service" | undefined;
};

type NameBuilderType = Extension | ClassName;

/**
 * A helper method to format names for use around the parsing and build outputs
 *
 * @param options A set of options that allow you to customise the final outputted string
 *
 * @returns a string formatted to the specificed option values
 */
export const NameBuilder = (options: NameBuilderType): string => {
  if (options.kind === "className") {
    return [options.name, options.type].join("");
  }

  if (options.kind === "extension") {
    return [options.name, options.type, ".", options.extension].join("");
  }

  return "";
};
