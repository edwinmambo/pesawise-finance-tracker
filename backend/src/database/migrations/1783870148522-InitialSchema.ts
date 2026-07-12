import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1783870148522 implements MigrationInterface {
    name = 'InitialSchema1783870148522'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "name" character varying NOT NULL, "currency" character varying NOT NULL DEFAULT 'KES', "persona" character varying, "tagline" character varying, "avatarColor" character varying NOT NULL DEFAULT '#10a37f', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."accounts_type_enum" AS ENUM('MPESA', 'BANK', 'CASH', 'SACCO')`);
        await queryRunner.query(`CREATE TABLE "accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "type" "public"."accounts_type_enum" NOT NULL, "openingBalance" numeric(14,2) NOT NULL DEFAULT '0', "institution" character varying, "color" character varying NOT NULL DEFAULT '#2563eb', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3aa23c0a6d107393e8b40e3e2a" ON "accounts" ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."categories_kind_enum" AS ENUM('INCOME', 'EXPENSE')`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "kind" "public"."categories_kind_enum" NOT NULL, "icon" character varying NOT NULL DEFAULT '💰', "color" character varying NOT NULL DEFAULT '#64748b', "isSystem" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_13e8b2a21988bec6fdcbb1fa74" ON "categories" ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('INCOME', 'EXPENSE')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_channel_enum" AS ENUM('MPESA', 'BANK', 'CASH', 'SACCO')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "type" "public"."transactions_type_enum" NOT NULL, "amount" numeric(14,2) NOT NULL, "date" date NOT NULL, "channel" "public"."transactions_channel_enum" NOT NULL DEFAULT 'MPESA', "note" character varying, "reference" character varying, "accountId" uuid, "categoryId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6bb58f2b6e30cb51a6504599f4" ON "transactions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d66471a99dd3836e1528d39a1e" ON "transactions" ("date") `);
        await queryRunner.query(`CREATE TABLE "loan_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "loanId" uuid NOT NULL, "amount" numeric(14,2) NOT NULL, "date" date NOT NULL, "note" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_db75e38243b5f2cb9e728da4d0f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c0268488cc84d23c1e5c6c1910" ON "loan_payments" ("loanId") `);
        await queryRunner.query(`CREATE TYPE "public"."loans_lendertype_enum" AS ENUM('BANK', 'MOBILE_APP', 'SACCO', 'INDIVIDUAL')`);
        await queryRunner.query(`CREATE TYPE "public"."loans_interesttype_enum" AS ENUM('FLAT', 'REDUCING')`);
        await queryRunner.query(`CREATE TYPE "public"."loans_status_enum" AS ENUM('ACTIVE', 'PAID', 'DEFAULTED')`);
        await queryRunner.query(`CREATE TABLE "loans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "lender" character varying NOT NULL, "lenderType" "public"."loans_lendertype_enum" NOT NULL DEFAULT 'BANK', "principal" numeric(14,2) NOT NULL, "interestRate" numeric(6,3) NOT NULL DEFAULT '0', "interestType" "public"."loans_interesttype_enum" NOT NULL DEFAULT 'REDUCING', "termMonths" integer NOT NULL DEFAULT '12', "startDate" date NOT NULL, "dueDate" date, "status" "public"."loans_status_enum" NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5c6942c1e13e4de135c5203ee61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4c2ab4e556520045a2285916d4" ON "loans" ("userId") `);
        await queryRunner.query(`CREATE TABLE "savings_contributions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "goalId" uuid NOT NULL, "amount" numeric(14,2) NOT NULL, "date" date NOT NULL, "note" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2df255cb0de0da5d8e9c9d2a3a7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e2c24666d117375febf68a84fc" ON "savings_contributions" ("goalId") `);
        await queryRunner.query(`CREATE TABLE "savings_goals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "targetAmount" numeric(14,2) NOT NULL, "targetDate" date, "icon" character varying NOT NULL DEFAULT '🎯', "color" character varying NOT NULL DEFAULT '#16a34a', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4f1e133521cfbf2b4252bd8f09d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_016b69b77386ed555edf7c6662" ON "savings_goals" ("userId") `);
        await queryRunner.query(`CREATE TABLE "budget_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "budgetId" uuid NOT NULL, "categoryId" uuid, "label" character varying NOT NULL, "limitAmount" numeric(14,2) NOT NULL DEFAULT '0', "icon" character varying NOT NULL DEFAULT '💸', "color" character varying NOT NULL DEFAULT '#64748b', CONSTRAINT "PK_9eb705f406c83a1167ef575cd7f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1160fb85bb3cb492ac954b491a" ON "budget_items" ("budgetId") `);
        await queryRunner.query(`CREATE TYPE "public"."budgets_plantype_enum" AS ENUM('COMRADE', 'HUSTLER', 'CORPORATE', 'CUSTOM')`);
        await queryRunner.query(`CREATE TABLE "budgets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "planType" "public"."budgets_plantype_enum" NOT NULL DEFAULT 'CUSTOM', "expectedIncome" numeric(14,2) NOT NULL DEFAULT '0', "icon" character varying NOT NULL DEFAULT '📋', "color" character varying NOT NULL DEFAULT '#10a37f', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9c8a51748f82387644b773da482" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_27e688ddf1ff3893b43065899f" ON "budgets" ("userId") `);
        await queryRunner.query(`ALTER TABLE "accounts" ADD CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_13e8b2a21988bec6fdcbb1fa741" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_26d8aec71ae9efbe468043cd2b9" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_86e965e74f9cc66149cf6c90f64" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loan_payments" ADD CONSTRAINT "FK_c0268488cc84d23c1e5c6c1910d" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loans" ADD CONSTRAINT "FK_4c2ab4e556520045a2285916d45" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_contributions" ADD CONSTRAINT "FK_e2c24666d117375febf68a84fca" FOREIGN KEY ("goalId") REFERENCES "savings_goals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_goals" ADD CONSTRAINT "FK_016b69b77386ed555edf7c66620" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budget_items" ADD CONSTRAINT "FK_1160fb85bb3cb492ac954b491a9" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_27e688ddf1ff3893b43065899f9" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_27e688ddf1ff3893b43065899f9"`);
        await queryRunner.query(`ALTER TABLE "budget_items" DROP CONSTRAINT "FK_1160fb85bb3cb492ac954b491a9"`);
        await queryRunner.query(`ALTER TABLE "savings_goals" DROP CONSTRAINT "FK_016b69b77386ed555edf7c66620"`);
        await queryRunner.query(`ALTER TABLE "savings_contributions" DROP CONSTRAINT "FK_e2c24666d117375febf68a84fca"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "FK_4c2ab4e556520045a2285916d45"`);
        await queryRunner.query(`ALTER TABLE "loan_payments" DROP CONSTRAINT "FK_c0268488cc84d23c1e5c6c1910d"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_86e965e74f9cc66149cf6c90f64"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_26d8aec71ae9efbe468043cd2b9"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_13e8b2a21988bec6fdcbb1fa741"`);
        await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_27e688ddf1ff3893b43065899f"`);
        await queryRunner.query(`DROP TABLE "budgets"`);
        await queryRunner.query(`DROP TYPE "public"."budgets_plantype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1160fb85bb3cb492ac954b491a"`);
        await queryRunner.query(`DROP TABLE "budget_items"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_016b69b77386ed555edf7c6662"`);
        await queryRunner.query(`DROP TABLE "savings_goals"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e2c24666d117375febf68a84fc"`);
        await queryRunner.query(`DROP TABLE "savings_contributions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c2ab4e556520045a2285916d4"`);
        await queryRunner.query(`DROP TABLE "loans"`);
        await queryRunner.query(`DROP TYPE "public"."loans_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."loans_interesttype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."loans_lendertype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c0268488cc84d23c1e5c6c1910"`);
        await queryRunner.query(`DROP TABLE "loan_payments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d66471a99dd3836e1528d39a1e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6bb58f2b6e30cb51a6504599f4"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_channel_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_13e8b2a21988bec6fdcbb1fa74"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP TYPE "public"."categories_kind_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3aa23c0a6d107393e8b40e3e2a"`);
        await queryRunner.query(`DROP TABLE "accounts"`);
        await queryRunner.query(`DROP TYPE "public"."accounts_type_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
