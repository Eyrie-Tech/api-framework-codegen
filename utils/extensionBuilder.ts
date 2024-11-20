// For the lolz
export const ExtensionBuilder = (
  str: string,
  type: "Controller" | "Service" | "Model",
  extension: "ts",
) => {
  return [str, type, ".", extension].join("");
};
