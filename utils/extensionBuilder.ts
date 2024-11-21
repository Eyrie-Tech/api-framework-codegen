// For the lolz
export const ExtensionBuilder = (
  str: string,
  type: "Controller" | "Service" | undefined,
  extension: "ts",
) => {
  return [str, type, ".", extension].join("");
};
