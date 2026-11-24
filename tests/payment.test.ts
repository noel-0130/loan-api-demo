import request from 'supertest';
import { expect } from 'chai';
import { app } from '../src/app';
import { db, resetDb } from '../src/store';
import { getToken } from './helpers';

describe('Payments', () => {
  let token: string;
  let loanId: number;

  const pay = (key: string | null, body: object) => {
    const req = request(app)
      .post('/payments')
      .set('Authorization', `Bearer ${token}`);
    if (key) req.set('Idempotency-Key', key);
    return req.send(body);
  };

  beforeEach(async () => {
    resetDb();
    token = await getToken();
    const loan = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5000, termMonths: 6 });
    loanId = loan.body.id;
    await request(app)
      .post(`/loans/${loanId}/approve`)
      .set('Authorization', `Bearer ${token}`);
  });

  it('does not double charge with the same Idempotency-Key', async () => {
    const a = await pay('key-123', { loanId, amount: 500 });
    const b = await pay('key-123', { loanId, amount: 500 });

    expect(a.status).to.equal(201);
    expect(b.body.id).to.equal(a.body.id);
    expect(db.payments).to.have.length(1);
  });

  it('creates separate payments for different keys', async () => {
    const a = await pay('key-1', { loanId, amount: 500 });
    const b = await pay('key-2', { loanId, amount: 500 });

    expect(a.body.id).to.not.equal(b.body.id);
    expect(db.payments).to.have.length(2);
  });

  it('requires the Idempotency-Key header', async () => {
    const res = await pay(null, { loanId, amount: 500 });
    expect(res.status).to.equal(400);
  });

  it('rejects the same key with a different request body', async () => {
    await pay('key-abc', { loanId, amount: 500 });
    const res = await pay('key-abc', { loanId, amount: 900 });

    expect(res.status).to.equal(422);
    expect(db.payments).to.have.length(1);
  });

  it('rejects payment for an unapproved loan', async () => {
    const pending = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, termMonths: 3 });
    const res = await pay('key-x', { loanId: pending.body.id, amount: 100 });

    expect(res.status).to.equal(409);
  });
});
