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
