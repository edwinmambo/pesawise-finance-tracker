import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
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

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5433', 10),
  username: process.env.DATABASE_USER ?? 'pesawise',
  password: process.env.DATABASE_PASSWORD ?? 'pesawise',
  database: process.env.DATABASE_NAME ?? 'pesawise',
  synchronize: true,
  entities: [
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
  ],
});
