import { DMMF } from "@prisma/generator-helper";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Schema } from "./nodes/schema";
import { GeneratorOptions } from "./types/generator";

export async function writeDBMLSchema(
  dmmf: DMMF.Document,
  opts?: GeneratorOptions,
): Promise<void> {
  const schema = new Schema(dmmf.datamodel);

  const directory = opts?.directory ?? "./";
  const filename = opts?.filename ?? "schema.dbml";
  const useAlias = opts?.useAlias === "true";
  const useNativeType = opts?.useNativeType === "true";
  const expandImplicitManyToMany = opts?.expandImplicitManyToMany !== "false";

  try {
    await mkdir(directory, { recursive: true });

    await writeFile(
      join(directory, filename),
      schema.print({
        useAlias,
        useNativeType,
        expandImplicitManyToMany,
      }),
    );
  } catch (e) {
    console.error("Unable to write file");
    throw e;
  }
}
