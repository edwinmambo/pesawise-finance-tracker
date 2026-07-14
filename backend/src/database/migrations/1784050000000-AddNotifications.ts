import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1784050000000 implements MigrationInterface {
  name = 'AddNotifications1784050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notifications" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"userId" uuid NOT NULL, ` +
        `"type" character varying NOT NULL, ` +
        `"title" character varying NOT NULL, ` +
        `"body" text NOT NULL, ` +
        `"icon" character varying NOT NULL DEFAULT '🔔', ` +
        `"link" character varying, ` +
        `"dedupeKey" character varying NOT NULL, ` +
        `"read" boolean NOT NULL DEFAULT false, ` +
        `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_userId" ON "notifications" ("userId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_notifications_user_dedupe" ON "notifications" ("userId", "dedupeKey")`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" ` +
        `FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_notifications_user_dedupe"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_userId"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
