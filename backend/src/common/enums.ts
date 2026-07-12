export enum AccountType {
  MPESA = 'MPESA',
  BANK = 'BANK',
  CASH = 'CASH',
  SACCO = 'SACCO',
}

export enum Channel {
  MPESA = 'MPESA',
  BANK = 'BANK',
  CASH = 'CASH',
  SACCO = 'SACCO',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  // Dormant until Phase 4 (account-to-account transfers). Defined now so the
  // schema carries the values; no code produces them yet. A transfer is a
  // linked pair of rows sharing `Transaction.transferGroupId`.
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}

export enum CategoryKind {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum LenderType {
  BANK = 'BANK',
  MOBILE_APP = 'MOBILE_APP',
  SACCO = 'SACCO',
  INDIVIDUAL = 'INDIVIDUAL',
}

export enum InterestType {
  FLAT = 'FLAT',
  REDUCING = 'REDUCING',
}

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  PAID = 'PAID',
  DEFAULTED = 'DEFAULTED',
}

export enum BudgetPlanType {
  COMRADE = 'COMRADE',
  HUSTLER = 'HUSTLER',
  CORPORATE = 'CORPORATE',
  CUSTOM = 'CUSTOM',
}

export enum ImportSource {
  MPESA_SMS = 'MPESA_SMS',
  MPESA_CSV = 'MPESA_CSV',
}

export enum ImportRowStatus {
  NEW = 'NEW', // parsed, not seen before — will be imported
  DUPLICATE = 'DUPLICATE', // reference already exists — skipped
  INVALID = 'INVALID', // couldn't be parsed cleanly
  COMMITTED = 'COMMITTED', // written to transactions
}

export enum Cadence {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}
