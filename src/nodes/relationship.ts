import { DMMF } from "@prisma/generator-helper";

import { Printable, PrintOptions } from "../types/printable";
import { fromPascalCaseToSpaced } from "../utilities";

import { Column } from "./column";
import { Table } from "./table";

type RelationType = "one-to-one" | "many-to-one" | "many-to-many";

export class Relationship implements Printable {
  public readonly name: string;
  private from: Table;
  private fromColumns: Column[];
  private to: Table;
  private toColumns: Column[];

  private type: RelationType;
  private onDelete: string | null;
  private onUpdate: string | null;

  static fromDatamodelRelation(
    { relationName }: Pick<DMMF.Field, "relationName">,
    tables: Table[],
  ) {
    if (!relationName) {
      throw new Error("Invalid relationship");
    }

    const { from, to } = this.getFromAndToFields(relationName, tables);
    const { fromTable, toTable } = this.getTables(from, to, tables);
    const { fromColumns, toColumns } = this.getColumns(from, to, tables);
    const type = this.getRelationType(from, to);
    return new Relationship({
      name: relationName,
      from: fromTable,
      to: toTable,
      fromColumns,
      toColumns,
      type,
      onUpdate: from.relationOnUpdate ?? null,
      onDelete: from.relationOnDelete ?? null,
    });
  }

  private static getFromAndToFields(
    name: string,
    tables: Table[],
  ): { from: DMMF.Field; to: DMMF.Field } {
    const ts = tables.filter((t) => t.hasObjectField(name));
    if (ts.length === 0) {
      throw new Error("Could not find relation tables");
    }
    if (ts.length > 2) {
      throw new Error("Found more than 2 tables for a given relation");
    }
    const fields = ts.flatMap((t) => t.getObjectFields(name));
    if (fields.length !== 2) {
      throw new Error("Relation field not found");
    }
    const field1 = fields[0];
    const field2 = fields[1];
    if (!field1 || !field2) {
      throw new Error("Field found is undefined");
    }
    // The direction of the relation doesn't matter in a many to many relation
    if (this.isManyToManyRelation(field1, field2)) {
      // We sort the direction based on the model names for consistency
      if (field1.type.localeCompare(field2.type) < 0) {
        return { from: field1, to: field2 };
      }
      return { from: field2, to: field1 };
    }
    if (field1.relationFromFields?.length) {
      return { from: field1, to: field2 };
    }
    if (field2.relationFromFields?.length) {
      return { from: field2, to: field1 };
    }
    throw new Error("Could not determine from and to fields");
  }

  private static getRelationType(
    from: DMMF.Field,
    to: DMMF.Field,
  ): RelationType {
    if (this.isManyToManyRelation(from, to)) {
      return "many-to-many";
    }
    if (this.isOneToOneRelation(from, to)) {
      return "one-to-one";
    }
    return "many-to-one";
  }

  private static isManyToManyRelation(from: DMMF.Field, to: DMMF.Field) {
    return from.isList && to.isList;
  }

  private static isOneToOneRelation(from: DMMF.Field, to: DMMF.Field) {
    return !from.isList && !to.isList;
  }

  private static getTables(from: DMMF.Field, to: DMMF.Field, tables: Table[]) {
    const fromTable = tables.find((t) => t.name === to.type);
    const toTable = tables.find((t) => t.name === from.type);

    if (!fromTable || !toTable) {
      throw new Error("Relation field table not found");
    }

    return { fromTable, toTable };
  }

  private static getColumns(from: DMMF.Field, to: DMMF.Field, tables: Table[]) {
    const { fromTable, toTable } = this.getTables(from, to, tables);
    if (this.isManyToManyRelation(from, to)) {
      const fromColumns = fromTable.getKey();
      const toColumns = toTable.getKey();
      if (!fromColumns || !toColumns) {
        throw new Error(
          "Relation fields of implicit many-to-many relation not found",
        );
      }
      return { fromColumns, toColumns };
    }

    if (!from.relationFromFields || !from.relationToFields) {
      throw new Error("Relation fields not found");
    }

    return {
      fromColumns: from.relationFromFields.map((c) => fromTable.getColumn(c)),
      toColumns: from.relationToFields.map((c) => toTable.getColumn(c)),
    };
  }

  constructor({
    name,
    from,
    to,
    fromColumns,
    toColumns,
    type,
    onUpdate,
    onDelete,
  }: {
    name: string;
    from: Table;
    to: Table;
    fromColumns: Column[];
    toColumns: Column[];
    type: RelationType;
    onUpdate: string | null;
    onDelete: string | null;
  }) {
    this.name = name;
    this.from = from;
    this.to = to;
    this.fromColumns = fromColumns;
    this.toColumns = toColumns;
    this.type = type;
    this.onUpdate = onUpdate;
    this.onDelete = onDelete;
  }

  private printRelationType() {
    switch (this.type) {
      case "one-to-one":
        return "-";
      case "many-to-one":
        return ">";
      case "many-to-many":
        return "<>";
    }
  }

  private printRelationColumns(columns: Column[]) {
    if (columns.length === 1) {
      return columns[0]?.name ?? "";
    }
    return `(${columns.map((c) => c.name).join(", ")})`;
  }

  print(opts?: PrintOptions) {
    if (opts?.expandImplicitManyToMany && this.type === "many-to-many") {
      if (
        this.fromColumns.length !== 1 ||
        !this.fromColumns[0] ||
        this.toColumns.length !== 1 ||
        !this.toColumns[0]
      ) {
        throw new Error();
      }
      const table = Table.fromRelationship({
        name: this.name,
        from: this.fromColumns[0],
        to: this.toColumns[0],
      });

      return (
        table.print(opts) +
        "\n\n" +
        `Ref ${this.name}: ${this.from.name}.${this.printRelationColumns(this.fromColumns)} < ${table.name}.A\n` +
        `Ref ${this.name}: ${this.to.name}.${this.printRelationColumns(this.toColumns)} < ${table.name}.B`
      );
    }

    const options = [];
    if (this.onUpdate) {
      options.push(`update: ${fromPascalCaseToSpaced(this.onUpdate)}`);
    }
    if (this.onDelete) {
      options.push(`delete: ${fromPascalCaseToSpaced(this.onDelete)}`);
    }

    const from = `${this.from.name}.${this.printRelationColumns(this.fromColumns)}`;
    const to = `${this.to.name}.${this.printRelationColumns(this.toColumns)}`;

    // In DBML, if the relationship is one-to-one the foreign key exists on the latter column
    if (this.type === "one-to-one") {
      return `Ref ${this.name}: ${to} ${this.printRelationType()} ${from}${options.length ? ` [${options.join(", ")}]` : ""}`;
    }

    return `Ref ${this.name}: ${from} ${this.printRelationType()} ${to}${options.length ? ` [${options.join(", ")}]` : ""}`;
  }
}
