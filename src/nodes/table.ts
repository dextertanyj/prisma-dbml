import { DMMF } from "@prisma/generator-helper";

import { Printable, PrintOptions } from "../types/printable";

import { Column } from "./column";
import { TableIndex } from "./table-index";

export class Table implements Printable {
  public readonly name: string;
  private readonly alias: string | null;
  private readonly note: string | null;
  private readonly columns: Record<string, Column> = {};
  private readonly indexes: TableIndex[] = [];
  private readonly objectFields: DMMF.Field[] = [];

  static fromDatamodelModel(model: DMMF.Model) {
    const table = new Table({
      name: model.name,
      alias: model.dbName,
      note: model.documentation ?? null,
    });

    for (const column of model.fields.filter((f) => f.kind !== "object")) {
      table.addColumn(column);
    }

    for (const column of model.fields.filter((f) => f.kind === "object")) {
      table.objectFields.push(column);
    }

    return table;
  }

  static fromRelationship({
    name,
    from,
    to,
  }: {
    name: string;
    from: Column;
    to: Column;
  }) {
    const t = new Table({ name, alias: null, note: null });
    t.columns.A = new Column({ name: "A", type: from.type });
    t.columns.B = new Column({ name: "B", type: to.type });

    t.indexes.push(
      new TableIndex({
        name: null,
        columns: [t.columns.A, t.columns.B],
        isUnique: true,
      }),
      new TableIndex({
        name: null,
        columns: [t.columns.B],
      }),
    );

    return t;
  }

  constructor({
    name,
    alias,
    note,
  }: {
    name: string;
    alias: string | null;
    note: string | null;
  }) {
    this.name = name;
    this.alias = alias;
    this.note = note;
  }

  private addColumn(column: DMMF.Field) {
    const col = Column.fromDatamodelField(column);
    this.columns[col.name] = col;
  }

  public getColumn(name: string) {
    const col = this.columns[name];
    if (!col) {
      throw new Error("Column not found");
    }
    return col;
  }

  public hasObjectField(relationName: string) {
    return !!this.objectFields.find((f) => f.relationName === relationName);
  }

  public listObjectFields(): DMMF.Field[] {
    return this.objectFields;
  }

  public getObjectFields(relationName: string): DMMF.Field[] {
    const fields = this.objectFields.filter(
      (f) => f.relationName === relationName,
    );
    if (!fields.length) {
      throw new Error("Object field not found");
    }
    return fields;
  }

  public getKey() {
    const index = this.indexes.find((idx) => idx.getIsKey());
    if (index) {
      return index.getColumns();
    }
    const column = Object.values(this.columns).find((c) => c.getIsKey());
    if (!column) {
      return null;
    }
    return [column];
  }

  addIndex(index: TableIndex) {
    this.indexes.push(index);
  }

  print(opts?: PrintOptions) {
    const columns = Object.values(this.columns)
      .map((c) => `  ${c.print(opts)}`)
      .join("\n");

    let indexes = Object.values(this.indexes)
      .map((idx) => `    ${idx.print()}`)
      .join("\n");
    if (indexes) {
      indexes = `  indexes {\n` + indexes + `\n  }`;
    }

    let note = "";
    if (this.note) {
      note = `  Note: "${this.note.replace(/\n/gi, "\\n")}"`;
    }

    return (
      `Table ${opts?.useAlias && this.alias ? this.alias : this.name} {\n` +
      [columns, indexes, note].filter((v) => !!v).join("\n\n") +
      `\n}`
    );
  }
}
