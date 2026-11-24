import { Router, Response } from 'express';
import { z } from 'zod';
import { getLoan, findIdempotent, createPaymentWithKey } from './db';
import { requireAuth } from './auth';

export const paymentsRouter = Router();

const paymentSchema = z.object({
  loanId: z.number().int(),
  amount: z.number().positive(),
});

// Replays the saved result if this key was already used
async function replayIfExists(
  res: Response,
  userId: string,
  key: string,
  fingerprint: string
): Promise<boolean> {
  const existing = await findIdempotent(userId, key);
  if (!existing) return false;
  if (existing.fingerprint !== fingerprint) {
    res
      .status(422)
      .json({ error: 'Idempotency-Key reused with a different request' });
  } else {
    res.status(201).json(existing.payment);
  }
  return true;
}

paymentsRouter.post('/payments', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const key = req.header('Idempotency-Key');
  if (!key) {
    res.status(400).json({ error: 'Idempotency-Key header required' });
    return;
  }

  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const fingerprint = JSON.stringify(parsed.data);
  if (await replayIfExists(res, userId, key, fingerprint)) return;

  const loan = await getLoan(parsed.data.loanId);
  if (!loan) {
    res.status(404).json({ error: 'Loan not found' });
    return;
  }
  if (loan.status !== 'approved') {
    res.status(409).json({ error: 'Loan not approved' });
    return;
  }

  try {
    const payment = await createPaymentWithKey(
      userId,
      key,
      fingerprint,
      parsed.data.loanId,
      parsed.data.amount
    );
    res.status(201).json(payment);
  } catch (err: any) {
    // Same key at the same time: the primary key blocks the second insert
    if (err.code === 'ER_DUP_ENTRY') {
      if (await replayIfExists(res, userId, key, fingerprint)) return;
    }
    throw err;
  }
});
