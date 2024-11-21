// For the lolz
export const ClassNameBuilder = (
  name: string,
  type?: "Controller" | "Service" | undefined,
) => {
  return [name, type].join("");
};
