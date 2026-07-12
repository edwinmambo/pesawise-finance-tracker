import 'reflect-metadata';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../users/user.entity';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Loan } from '../loans/loan.entity';
import { LoanPayment } from '../loans/loan-payment.entity';
import { SavingsGoal } from '../savings/savings-goal.entity';
import { SavingsContribution } from '../savings/savings-contribution.entity';
import { Budget } from '../budgets/budget.entity';
import { BudgetItem } from '../budgets/budget-item.entity';
import { ImportBatch } from '../imports/import-batch.entity';
import { ImportRow } from '../imports/import-row.entity';
import { RecurringRule } from '../recurring/recurring-rule.entity';

dotenv.config();

const entities = [
  User,
  Account,
  Category,
  Transaction,
  Loan,
  LoanPayment,
  SavingsGoal,
  SavingsContribution,
  Budget,
  BudgetItem,
  ImportBatch,
  ImportRow,
  RecurringRule,
];

// Resolves to the `.ts` sources under ts-node (dev/CLI) and the compiled `.js`
// under dist (prod). The migrations table is the single source of truth for the
// schema now that `synchronize` is off.
const migrations = [join(__dirname, 'migrations', '*.{ts,js}')];

const base = {
  type: 'postgres' as const,
  synchronize: false,
  entities,
  migrations,
  migrationsTableName: 'migrations',
};

// Managed hosts (e.g. Neon) provide a single DATABASE_URL + require SSL.
const options: DataSourceOptions = process.env.DATABASE_URL
  ? {
      ...base,
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      ...base,
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5433', 10),
      username: process.env.DATABASE_USER ?? 'pesawise',
      password: process.env.DATABASE_PASSWORD ?? 'pesawise',
      database: process.env.DATABASE_NAME ?? 'pesawise',
    };

export const AppDataSource = new DataSource(options);
