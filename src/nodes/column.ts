import { FieldDefault, FieldDefaultScalar } from "@prisma/dmmf";
import { DMMF } from "@prisma/generator-helper";

import { Printable, PrintOptions } from "../types/printable";
import { isArray, nativeTypeToString } from "../utilities";

export class Column implements Printable {
  public readonly name: string;
  public readonly type: string;
  private nativeType: string | null;
  private alias: string | null;
  private default: string | null;
  private note: string | null;

  private readonly isList: boolean;
  private isKey: boolean;
  private isUnique: boolean;
  private readonly isIncrement: boolean;
  private readonly isNullable: boolean;

  static fromDatamodelField(field: DMMF.Field) {
    const fieldDefault = this.fieldDefaultToString(field.default);
    const isIncrement = fieldDefault === "`autoincrement()`";

    return new Column({
      name: field.name,
      alias: field.dbName ?? null,
      type: field.type,
      nativeType: field.nativeType
        ? nativeTypeToString(field.nativeType)
        : null,
      isList: field.isList,
      isNullable: !field.isRequired,
      isKey: field.isId,
      isUnique: field.isId || field.isUnique,
      isIncrement: isIncrement,
      note: field.documentation ?? null,
      default: !isIncrement ? fieldDefault : null,
    });
  }

  private static fieldDefaultToString(
    fieldDefault:
      | FieldDefault
      | FieldDefaultScalar
      | readonly FieldDefaultScalar[]
      | undefined,
  ) {
    if (fieldDefault === undefined) {
      return null;
    }
    if (typeof fieldDefault === "string") {
      return `"${fieldDefault}"`;
    }
    if (typeof fieldDefault !== "object") {
      return fieldDefault.toString();
    }
    if (typeof fieldDefault === "object" && isArray(fieldDefault)) {
      return `\`[${fieldDefault.map((v) => v.toString()).join(", ")}]\``;
    }
    if (fieldDefault.name === "dbgenerated") {
      if (!fieldDefault.args[0]) {
        throw new Error("dbgenerated annotation does not have an argument");
      }
      if (typeof fieldDefault.args[0] === "number") {
        throw new Error(
          "dbgenerated annotation does not have a String argument",
        );
      }
      return `\`${fieldDefault.args[0]}\``;
    }

    if (fieldDefault.args.length === 0) {
      return `\`${fieldDefault.name}()\``;
    }

    return `\`${fieldDefault.name}(${fieldDefault.args.join(", ")})\``;
  }

  constructor({
    name,
    alias = null,
    type,
    nativeType = null,
    default: fieldDefault = null,
    isList = false,
    isKey = false,
    isUnique = false,
    isNullable = false,
    isIncrement = false,
    note = null,
  }: {
    name: string;
    alias?: string | null;
    type: string;
    nativeType?: string | null;
    default?: string | null;
    isList?: boolean;
    isKey?: boolean;
    isUnique?: boolean;
    isNullable?: boolean;
    isIncrement?: boolean;
    note?: string | null;
  }) {
    this.name = name;
    this.alias = alias;
    this.type = type;
    this.nativeType = nativeType;
    this.default = fieldDefault;
    this.isList = isList;
    this.isKey = isKey;
    this.isUnique = isUnique;
    this.isNullable = isNullable;
    this.isIncrement = isIncrement;
    this.note = note;
  }

  getIsKey() {
    return this.isKey;
  }

  setIsKey() {
    this.isKey = true;
  }

  setIsUnique() {
    this.isUnique = true;
  }

  print(opts?: PrintOptions) {
    const base = `${opts?.useAlias && this.alias ? this.alias : this.name} ${opts?.useNativeType && this.nativeType ? this.nativeType : this.type}${this.isList ? "[]" : ""}`;
    const attributes = [];
    if (this.isKey) {
      attributes.push("primary key");
    }
    if (this.isUnique) {
      attributes.push("unique");
    }
    if (!this.isNullable) {
      attributes.push("not null");
    }
    if (this.isIncrement) {
      attributes.push("increment");
    }
    if (this.default) {
      attributes.push(`default: ${this.default}`);
    }
    if (this.note) {
      attributes.push(`note: "${this.note.replace(/\n/gi, "\\n")}"`);
    }
    if (attributes.length !== 0) {
      return `${base} [${attributes.join(", ")}]`;
    }
    return base;
  }
}
