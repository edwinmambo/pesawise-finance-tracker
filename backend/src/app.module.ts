import { join } from 'path';
import { existsSync } from 'fs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Managed hosts (e.g. Neon) provide a single DATABASE_URL and require SSL.
        const url = config.get<string>('DATABASE_URL');
        const base = {
          type: 'postgres' as const,
          autoLoadEntities: true,
          // Dev convenience: auto-create schema. Swap for migrations before scale.
          synchronize: true,
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
  ],
})
export class AppModule {}
