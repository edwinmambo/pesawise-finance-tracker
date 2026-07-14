import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSavingsGoalCurrency1784050200000 implements MigrationInterface {
  name = 'AddSavingsGoalCurrency1784050200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "savings_goals" ADD COLUMN IF NOT EXISTS "currency" character varying NOT NULL DEFAULT 'KES'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "savings_goals" DROP COLUMN "currency"`);
  }
}
