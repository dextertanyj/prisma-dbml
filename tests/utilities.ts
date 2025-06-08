import { getDMMF } from "@prisma/internals";

export function generateDMMF(datamodel: string) {
  return getDMMF({ datamodel });
}
