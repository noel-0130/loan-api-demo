import mysql, { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

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

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'loans',
  connectionLimit: 10,
});

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    term_months INT NOT NULL,
    status ENUM('pending','approved') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_loans_user (user_id),
    INDEX idx_loans_status (status)
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_payments_loan (loan_id),
    CONSTRAINT fk_payments_loan FOREIGN KEY (loan_id) REFERENCES loans(id)
  )`,
  `CREATE TABLE IF NOT EXISTS idempotency_keys (
    user_id VARCHAR(100) NOT NULL,
    idem_key VARCHAR(100) NOT NULL,
    fingerprint VARCHAR(255) NOT NULL,
    payment_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, idem_key),
    CONSTRAINT fk_idem_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
  )`,
];

export async function initSchema() {
  for (const stmt of SCHEMA) {
    await pool.query(stmt);
  }
}

export async function resetDb() {
  await pool.query('DELETE FROM idempotency_keys');
  await pool.query('DELETE FROM payments');
  await pool.query('DELETE FROM loans');
}

export async function closePool() {
  await pool.end();
}

const toLoan = (r: any): Loan => ({
  id: r.id,
  userId: r.user_id,
  amount: Number(r.amount),
  termMonths: r.term_months,
  status: r.status,
});

const toPayment = (r: any): Payment => ({
  id: r.id,
  loanId: r.loan_id,
  amount: Number(r.amount),
});

export async function createLoan(
  userId: string,
  amount: number,
  termMonths: number
): Promise<Loan> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO loans (user_id, amount, term_months) VALUES (?, ?, ?)',
    [userId, amount, termMonths]
  );
  return (await getLoan(result.insertId))!;
}

export async function getLoan(id: number): Promise<Loan | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM loans WHERE id = ?',
    [id]
  );
  return rows[0] ? toLoan(rows[0]) : null;
}

export async function approveLoan(id: number): Promise<Loan | null> {
  await pool.execute("UPDATE loans SET status = 'approved' WHERE id = ?", [id]);
  return getLoan(id);
}

export async function findIdempotent(userId: string, key: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT k.fingerprint, p.id, p.loan_id, p.amount
     FROM idempotency_keys k
     JOIN payments p ON p.id = k.payment_id
     WHERE k.user_id = ? AND k.idem_key = ?`,
    [userId, key]
  );
  if (!rows[0]) return null;
  return { fingerprint: rows[0].fingerprint as string, payment: toPayment(rows[0]) };
}

// Payment and idempotency key are saved in ONE transaction
export async function createPaymentWithKey(
  userId: string,
  key: string,
  fingerprint: string,
  loanId: number,
  amount: number
): Promise<Payment> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.execute<ResultSetHeader>(
      'INSERT INTO payments (loan_id, amount) VALUES (?, ?)',
      [loanId, amount]
    );
    await conn.execute(
      'INSERT INTO idempotency_keys (user_id, idem_key, fingerprint, payment_id) VALUES (?, ?, ?, ?)',
      [userId, key, fingerprint, r.insertId]
    );
    await conn.commit();
    return { id: r.insertId, loanId, amount };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function countPayments(): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM payments'
  );
  return Number(rows[0].c);
}

