import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTransferAndCurrencyFields1783870199551 implements MigrationInterface {
    name = 'AddTransferAndCurrencyFields1783870199551'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" ADD "currency" character varying NOT NULL DEFAULT 'KES'`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "transferGroupId" uuid`);
        await queryRunner.query(`ALTER TYPE "public"."transactions_type_enum" RENAME TO "transactions_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT')`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "public"."transactions_type_enum" USING "type"::"text"::"public"."transactions_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_b0c6dae5773bcbd1ccdcc98242" ON "transactions" ("transferGroupId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_b0c6dae5773bcbd1ccdcc98242"`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum_old" AS ENUM('INCOME', 'EXPENSE')`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "public"."transactions_type_enum_old" USING "type"::"text"::"public"."transactions_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."transactions_type_enum_old" RENAME TO "transactions_type_enum"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "transferGroupId"`);
        await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "currency"`);
    }

}
