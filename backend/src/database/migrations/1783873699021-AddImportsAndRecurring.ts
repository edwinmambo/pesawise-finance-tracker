import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImportsAndRecurring1783873699021 implements MigrationInterface {
    name = 'AddImportsAndRecurring1783873699021'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."import_rows_type_enum" AS ENUM('INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT')`);
        await queryRunner.query(`CREATE TYPE "public"."import_rows_channel_enum" AS ENUM('MPESA', 'BANK', 'CASH', 'SACCO')`);
        await queryRunner.query(`CREATE TYPE "public"."import_rows_status_enum" AS ENUM('NEW', 'DUPLICATE', 'INVALID', 'COMMITTED')`);
        await queryRunner.query(`CREATE TABLE "import_rows" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "batchId" uuid NOT NULL, "reference" character varying, "type" "public"."import_rows_type_enum" NOT NULL, "amount" numeric(14,2) NOT NULL, "date" date NOT NULL, "channel" "public"."import_rows_channel_enum" NOT NULL DEFAULT 'MPESA', "note" character varying, "raw" text NOT NULL, "status" "public"."import_rows_status_enum" NOT NULL DEFAULT 'NEW', CONSTRAINT "PK_45b442c5ced30d539ba20c3ec32" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_52bced3588f4a8d7cba78bc970" ON "import_rows" ("batchId") `);
        await queryRunner.query(`CREATE TYPE "public"."import_batches_source_enum" AS ENUM('MPESA_SMS', 'MPESA_CSV')`);
        await queryRunner.query(`CREATE TABLE "import_batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "source" "public"."import_batches_source_enum" NOT NULL, "committed" boolean NOT NULL DEFAULT false, "parsedCount" integer NOT NULL DEFAULT '0', "duplicateCount" integer NOT NULL DEFAULT '0', "unparsedCount" integer NOT NULL DEFAULT '0', "committedCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6162597a2576c03e04bb2c1a2dd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c5ad7102803c6170805d87c8af" ON "import_batches" ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."recurring_rules_type_enum" AS ENUM('INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT')`);
        await queryRunner.query(`CREATE TYPE "public"."recurring_rules_channel_enum" AS ENUM('MPESA', 'BANK', 'CASH', 'SACCO')`);
        await queryRunner.query(`CREATE TYPE "public"."recurring_rules_cadence_enum" AS ENUM('WEEKLY', 'MONTHLY')`);
        await queryRunner.query(`CREATE TABLE "recurring_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "type" "public"."recurring_rules_type_enum" NOT NULL, "amount" numeric(14,2) NOT NULL, "channel" "public"."recurring_rules_channel_enum" NOT NULL DEFAULT 'MPESA', "categoryId" uuid, "accountId" uuid, "cadence" "public"."recurring_rules_cadence_enum" NOT NULL, "anchorDay" integer NOT NULL, "nextRunAt" date NOT NULL, "lastRunAt" date, "active" boolean NOT NULL DEFAULT true, "note" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_22942a1b99033aea3a8bc8f9e8d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_71df27ebc5aca170edbc2e84b4" ON "recurring_rules" ("userId") `);
        await queryRunner.query(`ALTER TABLE "import_rows" ADD CONSTRAINT "FK_52bced3588f4a8d7cba78bc9709" FOREIGN KEY ("batchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "import_rows" DROP CONSTRAINT "FK_52bced3588f4a8d7cba78bc9709"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_71df27ebc5aca170edbc2e84b4"`);
        await queryRunner.query(`DROP TABLE "recurring_rules"`);
        await queryRunner.query(`DROP TYPE "public"."recurring_rules_cadence_enum"`);
        await queryRunner.query(`DROP TYPE "public"."recurring_rules_channel_enum"`);
        await queryRunner.query(`DROP TYPE "public"."recurring_rules_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c5ad7102803c6170805d87c8af"`);
        await queryRunner.query(`DROP TABLE "import_batches"`);
        await queryRunner.query(`DROP TYPE "public"."import_batches_source_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_52bced3588f4a8d7cba78bc970"`);
        await queryRunner.query(`DROP TABLE "import_rows"`);
        await queryRunner.query(`DROP TYPE "public"."import_rows_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."import_rows_channel_enum"`);
        await queryRunner.query(`DROP TYPE "public"."import_rows_type_enum"`);
    }

}
