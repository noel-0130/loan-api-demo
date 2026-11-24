export interface Loan {
  id: number;
  userId: string;
  amount: number;
  termMonths: number;
  status: 'pending' | 'approved';
}

export const db = {
  loans: [] as Loan[],
  nextLoanId: 1,
};

export function resetDb() {
  db.loans = [];
  db.nextLoanId = 1;
}
