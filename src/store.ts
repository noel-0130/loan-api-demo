export interface Loan {
  id: number;
  userId: string;
  amount: number;
  termMonths: number;
  status: 'pending' | 'approved';
}

export interface Payment {
  id: number;
  loanId: number;
  amount: number;
}

export const db = {
  loans: [] as Loan[],
  payments: [] as Payment[],
  idempotency: new Map<string, { fingerprint: string; payment: Payment }>(),
  nextLoanId: 1,
  nextPaymentId: 1,
};

export function resetDb() {
  db.loans = [];
  db.payments = [];
  db.idempotency.clear();
  db.nextLoanId = 1;
  db.nextPaymentId = 1;
}
