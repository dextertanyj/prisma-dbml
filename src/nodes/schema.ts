import { DMMF } from "@prisma/generator-helper";

import { Printable, PrintOptions } from "../types/printable";

import { Enum } from "./enum";
import { Relationship } from "./relationship";
import { Table } from "./table";
import { TableIndex } from "./table-index";

export class Schema implements Printable {
  public readonly enums: Enum[];
  public readonly tables: Table[];
  private readonly relationships: Record<string, Relationship> = {};

  constructor(datamodel: DMMF.Datamodel) {
    this.enums = datamodel.enums.map((e) => Enum.fromDatamodelEnum(e));
    this.tables = datamodel.models.map((m) => Table.fromDatamodelModel(m));
    datamodel.indexes.map((idx) =>
      TableIndex.fromDatamodelIndex(idx, this.tables),
    );
    const relations = this.tables
      .flatMap((t) => t.listObjectFields())
      .map((f) => Relationship.fromDatamodelRelation(f, this.tables));
    for (const relation of relations) {
      this.relationships[relation.name] = relation;
    }
  }

  print(opts?: PrintOptions) {
    const enums = this.enums.map((e) => e.print(opts)).join("\n\n");
    const tables = this.tables.map((t) => t.print(opts)).join("\n\n");
    const relationships = Object.values(this.relationships)
      .map((r) => r.print(opts))
      .join("\n");
    return [tables, enums, relationships].filter((v) => !!v).join("\n\n");
  }
}
