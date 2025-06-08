import { generatorHandler } from "@prisma/generator-helper";

import { GeneratorOptions } from "./types/generator";
import { writeDBMLSchema } from "./generate";

generatorHandler({
  onManifest: () => ({
    defaultOutput: "./dbml",
    prettyName: "DBML Schema",
  }),
  onGenerate: (options) => {
    return writeDBMLSchema(
      options.dmmf,
      options.generator.config as GeneratorOptions,
    );
  },
});
