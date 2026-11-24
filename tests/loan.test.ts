import request from 'supertest';
import { expect } from 'chai';
import { app } from '../src/app';
import { resetDb } from '../src/store';
import { getToken } from './helpers';

describe('Loans', () => {
  let token: string;

  beforeEach(async () => {
    resetDb();
    token = await getToken();
  });

  it('creates a pending loan', async () => {
    const res = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5000, termMonths: 6 });
    expect(res.status).to.equal(201);
    expect(res.body.status).to.equal('pending');
  });

  it('rejects a negative amount (Zod)', async () => {
    const res = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: -100, termMonths: 6 });
    expect(res.status).to.equal(400);
  });

  it('rejects missing fields (Zod)', async () => {
    const res = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5000 });
    expect(res.status).to.equal(400);
  });

  it('rejects a loan request without a token', async () => {
    const res = await request(app)
      .post('/loans')
      .send({ amount: 5000, termMonths: 6 });
    expect(res.status).to.equal(401);
  });

  it('approves a loan', async () => {
    const created = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5000, termMonths: 6 });
    const res = await request(app)
      .post(`/loans/${created.body.id}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).to.equal(200);
    expect(res.body.status).to.equal('approved');
  });

  it('returns 404 when approving a missing loan', async () => {
    const res = await request(app)
      .post('/loans/999/approve')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).to.equal(404);
  });
});
