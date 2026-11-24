import { expect } from 'chai';
import { countPayments, resetDb } from '../src/db';
import { getToken, createApprovedLoan, pay } from './helpers';

describe('Idempotency (MySQL)', () => {
  let token: string;
  let loanId: number;

  beforeEach(async () => {
    await resetDb();
    token = await getToken();
    loanId = await createApprovedLoan(token);
  });

  it('scopes idempotency keys per user', async () => {
    const maria = await getToken('maria');
    const a = await pay(token, 'shared-key', { loanId, amount: 500 });
    const b = await pay(maria, 'shared-key', { loanId, amount: 500 });
    expect(a.body.id).to.not.equal(b.body.id);
    expect(await countPayments()).to.equal(2);
  });

  it('handles two simultaneous requests with the same key', async () => {
    const [a, b] = await Promise.all([
      pay(token, 'key-race', { loanId, amount: 500 }),
      pay(token, 'key-race', { loanId, amount: 500 }),
    ]);
    expect(a.status).to.equal(201);
    expect(b.status).to.equal(201);
    expect(a.body.id).to.equal(b.body.id);
    expect(await countPayments()).to.equal(1);
  });
});
