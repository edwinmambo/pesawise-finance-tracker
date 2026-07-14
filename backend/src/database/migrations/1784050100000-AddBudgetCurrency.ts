import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBudgetCurrency1784050100000 implements MigrationInterface {
  name = 'AddBudgetCurrency1784050100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "currency" character varying NOT NULL DEFAULT 'KES'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budgets" DROP COLUMN "currency"`);
  }
}
