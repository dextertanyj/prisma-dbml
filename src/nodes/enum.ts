import { DMMF } from "@prisma/generator-helper";

import { Printable, PrintOptions } from "../types/printable";

export class EnumValue implements Printable {
  private name: string;
  private alias: string | null;

  static fromDatamodelEnumValue(value: DMMF.EnumValue) {
    return new EnumValue({ name: value.name, alias: value.dbName });
  }

  constructor({ name, alias }: { name: string; alias: string | null }) {
    this.name = name;
    this.alias = alias;
  }

  print(opts?: PrintOptions): string {
    return opts?.useAlias && this.alias ? this.alias : this.name;
  }
}

export class Enum implements Printable {
  private name: string;
  private readonly alias: string | null;
  private values: EnumValue[];

  static fromDatamodelEnum(enumeration: DMMF.DatamodelEnum) {
    const e = new Enum({
      name: enumeration.name,
      alias: enumeration.dbName ?? null,
    });
    for (const value of enumeration.values) {
      e.addValue(value);
    }

    return e;
  }

  constructor({ name, alias }: { name: string; alias: string | null }) {
    this.name = name;
    this.alias = alias;
    this.values = [];
  }

  private addValue(v: DMMF.EnumValue) {
    this.values.push(EnumValue.fromDatamodelEnumValue(v));
  }

  print(opts?: PrintOptions): string {
    return (
      `enum ${opts?.useAlias && this.alias ? this.alias : this.name} {\n` +
      this.values.map((v) => `  ${v.print(opts)}`).join("\n") +
      `\n}`
    );
  }
}
