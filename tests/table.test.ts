import dedent from "dedent";

import { Schema } from "../src/nodes/schema";

import { generateDMMF } from "./utilities";

describe("Table Tests", () => {
  test("Basic Table", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int @id
        name String
      }
    `);

    expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
      id Int [primary key, unique, not null]
      name String [not null]
    }`);
  });

  test("Nullable Columns", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int @id
        name String
        email String?
      }
    `);

    expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
      id Int [primary key, unique, not null]
      name String [not null]
      email String
    }`);
  });

  test("Scalar List Columns", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      datasource db {
        provider = "postgresql"
        url      = env("DATABASE_URL")
      }

      model User {
        id Int @id
        name String
        emails String[]
      }
    `);

    expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
      id Int [primary key, unique, not null]
      name String [not null]
      emails String[] [not null]
    }`);
  });

  test("Enum Columns", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int @id
        name String
        role Role
      }

      enum Role {
        VIEWER
        EDITOR
      }
    `);

    expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
      id Int [primary key, unique, not null]
      name String [not null]
      role Role [not null]
    }

    enum Role {
      VIEWER
      EDITOR
    }`);
  });

  test("Unique Columns", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int @id
        name String
        handle String @unique
      }
    `);

    expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
      id Int [primary key, unique, not null]
      name String [not null]
      handle String [unique, not null]
    }`);
  });

  test("Composite Primary Key", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int
        name String

        @@id([id, name])
      }
    `);

    expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
      id Int [not null]
      name String [not null]

      indexes {
        (id, name) [pk, unique]
      }
    }`);
  });

  test("Composite Unique Columns", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int @id
        name String

        @@unique([id, name])
      }
    `);

    expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
      id Int [primary key, unique, not null]
      name String [not null]

      indexes {
        (id, name) [unique]
      }
    }`);
  });

  test("Table Alias", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int @id
        name String
        
        @@map("TableAlias")
      }
    `);

    expect(new Schema(dmmf.datamodel).print({ useAlias: true }))
      .toEqual(dedent`Table TableAlias {
      id Int [primary key, unique, not null]
      name String [not null]
    }`);
  });

  test("Column Alias", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int @id
        name String @map("ColumnAlias")
      }
    `);

    expect(new Schema(dmmf.datamodel).print({ useAlias: true }))
      .toEqual(dedent`Table User {
      id Int [primary key, unique, not null]
      ColumnAlias String [not null]
    }`);
  });

  test("Table Documentation", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      /// Table Notes Line 1
      /// Table Notes Line 2
      model User {
        id Int @id
        name String
      }
    `);

    expect(new Schema(dmmf.datamodel).print()).toEqual(`Table User {
  id Int [primary key, unique, not null]
  name String [not null]

  Note: "Table Notes Line 1\\nTable Notes Line 2"
}`);
  });

  test("Column Documentation", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int @id
        /// Column Notes Line 1
        /// Column Notes Line 2
        name String
      }
    `);

    expect(new Schema(dmmf.datamodel).print()).toEqual(`Table User {
  id Int [primary key, unique, not null]
  name String [not null, note: "Column Notes Line 1\\nColumn Notes Line 2"]
}`);
  });

  test("Column Autoincrement", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int @id @default(autoincrement())
        name String
      }
    `);

    expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
      id Int [primary key, unique, not null, increment]
      name String [not null]
    }`);
  });

  test("Column Default", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      datasource db {
        provider = "postgresql"
        url      = env("DATABASE_URL")
      }

      model User {
        id Int @id @default(dbgenerated("gen_random_uuid()"))
        name String @default("")
        emails String[] @default(["here", "there"])
        isActive Boolean @default(true)
        role Role @default(VIEWER)

        createdAt DateTime @default(now())
      }

      enum Role {
        VIEWER
        EDITOR
      }
    `);

    expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
      id Int [primary key, unique, not null, default: \`gen_random_uuid()\`]
      name String [not null, default: ""]
      emails String[] [not null, default: \`[here, there]\`]
      isActive Boolean [not null, default: true]
      role Role [not null, default: "VIEWER"]
      createdAt DateTime [not null, default: \`now()\`]
    }

    enum Role {
      VIEWER
      EDITOR
    }`);
  });

  test("Column Database Type", async () => {
    const dmmf = await generateDMMF(/* Prisma */ `
      datasource db {
        provider = "postgresql"
        url      = env("DATABASE_URL")
      }

      model User {
        id Int @id
        name String @db.Text
        decimal Decimal @db.Decimal(65,30)
        decimal2 Decimal[] @db.Decimal(65,30)

        createdAt DateTime @default(now()) @db.Timestamptz(3)
      }
    `);

    expect(new Schema(dmmf.datamodel).print({ useNativeType: true }))
      .toEqual(dedent`Table User {
      id Int [primary key, unique, not null]
      name Text [not null]
      decimal Decimal(65,30) [not null]
      decimal2 Decimal(65,30)[] [not null]
      createdAt Timestamptz(3) [not null, default: \`now()\`]
    }`);
  });
});
