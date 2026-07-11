import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { LoansModule } from './loans/loans.module';
import { SavingsModule } from './savings/savings.module';
import { BudgetsModule } from './budgets/budgets.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: parseInt(config.get<string>('DATABASE_PORT', '5433'), 10),
        username: config.get<string>('DATABASE_USER', 'pesawise'),
        password: config.get<string>('DATABASE_PASSWORD', 'pesawise'),
        database: config.get<string>('DATABASE_NAME', 'pesawise'),
        autoLoadEntities: true,
        // Dev convenience: auto-create schema. Swap for migrations in production.
        synchronize: true,
      }),
    }),
    AuthModule,
    UsersModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    LoansModule,
    SavingsModule,
    BudgetsModule,
    DashboardModule,
  ],
})
export class AppModule {}
