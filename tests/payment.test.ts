import request from 'supertest';
import { expect } from 'chai';
import { app } from '../src/app';
import { countPayments, resetDb } from '../src/db';
import { getToken, createApprovedLoan, pay } from './helpers';

describe('Payments', () => {
  let token: string;
  let loanId: number;

  beforeEach(async () => {
    await resetDb();
    token = await getToken();
    loanId = await createApprovedLoan(token);
  });

  it('does not double charge with the same Idempotency-Key', async () => {
    const a = await pay(token, 'key-123', { loanId, amount: 500 });
    const b = await pay(token, 'key-123', { loanId, amount: 500 });
    expect(a.status).to.equal(201);
    expect(b.body.id).to.equal(a.body.id);
    expect(await countPayments()).to.equal(1);
  });

  it('creates separate payments for different keys', async () => {
    const a = await pay(token, 'key-1', { loanId, amount: 500 });
    const b = await pay(token, 'key-2', { loanId, amount: 500 });
    expect(a.body.id).to.not.equal(b.body.id);
    expect(await countPayments()).to.equal(2);
  });

  it('requires the Idempotency-Key header', async () => {
    const res = await pay(token, null, { loanId, amount: 500 });
    expect(res.status).to.equal(400);
  });

  it('rejects the same key with a different request body', async () => {
    await pay(token, 'key-abc', { loanId, amount: 500 });
    const res = await pay(token, 'key-abc', { loanId, amount: 900 });
    expect(res.status).to.equal(422);
    expect(await countPayments()).to.equal(1);
  });

  it('rejects payment for an unapproved loan', async () => {
    const pending = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, termMonths: 3 });
    const res = await pay(token, 'key-x', { loanId: pending.body.id, amount: 100 });
    expect(res.status).to.equal(409);
  });
});
