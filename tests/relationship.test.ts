import dedent from "dedent";

import { Schema } from "../src/nodes/schema";

import { generateDMMF } from "./utilities";

describe("Relationship Tests", () => {
  describe("Basic Relationships", () => {
    test("One to One", async () => {
      const dmmf = await generateDMMF(/* Prisma */ `
        model User {
          id Int @id
          name String
          accountId Int @unique
          account Account @relation(fields: [accountId], references: [id])
        }
  
        model Account {
          id Int @id
          user User?
        }
      `);

      expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
        id Int [primary key, unique, not null]
        name String [not null]
        accountId Int [unique, not null]
      }

      Table Account {
        id Int [primary key, unique, not null]
      }

      Ref AccountToUser: Account.id - User.accountId`);
    });

    test("Many to One", async () => {
      const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int @id
        name String
        roleId Int 
        role Role @relation(fields: [roleId], references: [id])
      }

      model Role {
        id Int @id
        name String
        users User[]
      }
    `);

      expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
        id Int [primary key, unique, not null]
        name String [not null]
        roleId Int [not null]
      }

      Table Role {
        id Int [primary key, unique, not null]
        name String [not null]
      }

      Ref RoleToUser: User.roleId > Role.id`);
    });

    test("Implicit Many to Many", async () => {
      const dmmf = await generateDMMF(/* Prisma */ `
        model User {
          id Int @id
          name String
          roles Role[]
        }

        model Role {
          id Int @id
          name String
          users User[]
        }
      `);

      expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
        id Int [primary key, unique, not null]
        name String [not null]
      }

      Table Role {
        id Int [primary key, unique, not null]
        name String [not null]
      }

      Ref RoleToUser: User.id <> Role.id`);

      expect(
        new Schema(dmmf.datamodel).print({ expandImplicitManyToMany: true }),
      ).toEqual(dedent`Table User {
        id Int [primary key, unique, not null]
        name String [not null]
      }

      Table Role {
        id Int [primary key, unique, not null]
        name String [not null]
      }

      Table RoleToUser {
        A Int [not null]
        B Int [not null]

        indexes {
          (A, B) [unique]
          (B)
        }
      }

      Ref RoleToUser: User.id < RoleToUser.A
      Ref RoleToUser: Role.id < RoleToUser.B`);
    });

    test("Explicit Many to Many", async () => {
      const dmmf = await generateDMMF(/* Prisma */ `
        model User {
          id Int @id
          name String
          roles UserRole[]
        }

        model UserRole {
          userId Int
          user User @relation(fields: [userId], references: [id])
          roleId Int
          role Role @relation(fields: [roleId], references: [id])

          @@id([userId, roleId])
        }

        model Role {
          id Int @id
          name String
          users UserRole[]
        }
      `);

      expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
        id Int [primary key, unique, not null]
        name String [not null]
      }

      Table UserRole {
        userId Int [not null]
        roleId Int [not null]

        indexes {
          (userId, roleId) [pk, unique]
        }
      }

      Table Role {
        id Int [primary key, unique, not null]
        name String [not null]
      }

      Ref UserToUserRole: UserRole.userId > User.id
      Ref RoleToUserRole: UserRole.roleId > Role.id`);
    });

    test("On Update", async () => {
      const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int @id
        name String
        roleId Int 
        role Role @relation(fields: [roleId], references: [id], onUpdate: NoAction)
      }

      model Role {
        id Int @id
        name String
        users User[]
      }
    `);

      expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
        id Int [primary key, unique, not null]
        name String [not null]
        roleId Int [not null]
      }

      Table Role {
        id Int [primary key, unique, not null]
        name String [not null]
      }

      Ref RoleToUser: User.roleId > Role.id [update: no action]`);
    });

    test("On Delete", async () => {
      const dmmf = await generateDMMF(/* Prisma */ `
      model User {
        id Int @id
        name String
        roleId Int 
        role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
      }

      model Role {
        id Int @id
        name String
        users User[]
      }
    `);

      expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
        id Int [primary key, unique, not null]
        name String [not null]
        roleId Int [not null]
      }

      Table Role {
        id Int [primary key, unique, not null]
        name String [not null]
      }

      Ref RoleToUser: User.roleId > Role.id [delete: cascade]`);
    });
  });

  describe("Self Relationships", async () => {
    test("One to One", async () => {
      const dmmf = await generateDMMF(/* Prisma */ `
        model User {
          id Int @id
          name String
          parentId Int? @unique
          parent User? @relation("ChildToParent", fields: [parentId], references: [id])
          child User? @relation("ChildToParent")
        }
      `);

      expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
        id Int [primary key, unique, not null]
        name String [not null]
        parentId Int [unique]
      }

      Ref ChildToParent: User.id - User.parentId`);
    });

    test("Many to One", async () => {
      const dmmf = await generateDMMF(/* Prisma */ `
        model User {
          id Int @id
          name String
          parentId Int? @unique
          parent User? @relation("ChildToParent", fields: [parentId], references: [id])
          child User[] @relation("ChildToParent")
        }
      `);

      expect(new Schema(dmmf.datamodel).print()).toEqual(dedent`Table User {
        id Int [primary key, unique, not null]
        name String [not null]
        parentId Int [unique]
      }

      Ref ChildToParent: User.parentId > User.id`);
    });

    test("Many to Many", async () => {
      const dmmf = await generateDMMF(/* Prisma */ `
        model User {
          id Int @id
          name String
          parent User[] @relation("ChildToParent")
          child User[] @relation("ChildToParent")
        }
      `);

      expect(
        new Schema(dmmf.datamodel).print({ expandImplicitManyToMany: true }),
      ).toEqual(dedent`Table User {
        id Int [primary key, unique, not null]
        name String [not null]
      }

      Table ChildToParent {
        A Int [not null]
        B Int [not null]

        indexes {
          (A, B) [unique]
          (B)
        }
      }

      Ref ChildToParent: User.id < ChildToParent.A
      Ref ChildToParent: User.id < ChildToParent.B`);
    });
  });
});
