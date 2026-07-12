import { join } from 'path';
import { existsSync } from 'fs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { LoansModule } from './loans/loans.module';
import { SavingsModule } from './savings/savings.module';
import { BudgetsModule } from './budgets/budgets.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { ImportsModule } from './imports/imports.module';
import { RecurringModule } from './recurring/recurring.module';
import { FxModule } from './common/fx.module';

// In the single-service production image the built Angular app is copied to
// ../client and served by this API. In local dev it isn't present, so we skip
// static serving and the frontend runs separately (ng serve on :4200).
const clientPath = join(__dirname, '..', 'client');
const staticImports = existsSync(clientPath)
  ? [
      ServeStaticModule.forRoot({
        rootPath: clientPath,
        exclude: ['/api/{*path}'],
      }),
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    FxModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Managed hosts (e.g. Neon) provide a single DATABASE_URL and require SSL.
        const url = config.get<string>('DATABASE_URL');
        const base = {
          type: 'postgres' as const,
          autoLoadEntities: true,
          // Schema is owned by migrations now (see database/migrations). They are
          // applied by docker-entrypoint.sh before the app boots; the app itself
          // never mutates the schema.
          synchronize: false,
          migrations: [join(__dirname, 'database', 'migrations', '*.{ts,js}')],
          migrationsTableName: 'migrations',
          migrationsRun: false,
        };
        if (url) {
          return { ...base, url, ssl: { rejectUnauthorized: false } };
        }
        return {
          ...base,
          host: config.get<string>('DATABASE_HOST', 'localhost'),
          port: parseInt(config.get<string>('DATABASE_PORT', '5433'), 10),
          username: config.get<string>('DATABASE_USER', 'pesawise'),
          password: config.get<string>('DATABASE_PASSWORD', 'pesawise'),
          database: config.get<string>('DATABASE_NAME', 'pesawise'),
        };
      },
    }),
    ...staticImports,
    AuthModule,
    UsersModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    LoansModule,
    SavingsModule,
    BudgetsModule,
    DashboardModule,
    ReportsModule,
    ImportsModule,
    RecurringModule,
  ],
})
export class AppModule {}
