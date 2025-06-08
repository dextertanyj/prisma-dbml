import { DMMF } from "@prisma/generator-helper";

import { Printable } from "../types/printable";

import { Column } from "./column";
import { Table } from "./table";

export class TableIndex implements Printable {
  public readonly name: string | null;
  private columns: Column[];
  private isKey: boolean;
  private isUnique: boolean;

  static fromDatamodelIndex(index: DMMF.Index, tables: Table[]) {
    const isKey = index.type === "id";
    const isUnique = index.type === "id" || index.type === "unique";
    const table = tables.find((table) => table.name === index.model);
    if (!table) {
      throw new Error("Table for index not found");
    }

    const columns = index.fields.map(({ name }) => table.getColumn(name));

    if (columns.length === 0) {
      throw new Error("Empty index found");
    }

    if (columns.length === 1) {
      if (!columns[0]) {
        throw new Error("Column not found");
      }
      const col = columns[0];
      if (isKey) {
        col.setIsKey();
      }
      if (isUnique) {
        col.setIsUnique();
      }
      if (isKey || isUnique) {
        return null;
      }
    }

    const idx = new TableIndex({
      name: index.name ?? null,
      columns,
      isKey,
      isUnique,
    });

    table.addIndex(idx);
    return idx;
  }

  constructor({
    name,
    columns,
    isKey = false,
    isUnique = false,
  }: {
    name: string | null;
    columns: Column[];
    isKey?: boolean;
    isUnique?: boolean;
  }) {
    this.name = name;
    this.columns = columns;
    this.isKey = isKey;
    this.isUnique = isUnique;
  }

  getColumns() {
    return [...this.columns];
  }

  getIsKey() {
    return this.isKey;
  }

  print() {
    const base = `(${this.columns.map(({ name }) => name).join(", ")})`;

    const attributes = [];
    if (this.isKey) {
      attributes.push("pk");
    }
    if (this.isUnique) {
      attributes.push("unique");
    }
    if (attributes.length !== 0) {
      return `${base} [${attributes.join(", ")}]`;
    }
    return base;
  }
}
