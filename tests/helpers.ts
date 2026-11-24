import request from 'supertest';
import { app } from '../src/app';

export async function getToken(username = 'juan') {
  const res = await request(app)
    .post('/login')
    .send({ username, password: 'password123' });
  return res.body.token as string;
}

export async function createApprovedLoan(token: string) {
  const loan = await request(app)
    .post('/loans')
    .set('Authorization', `Bearer ${token}`)
    .send({ amount: 5000, termMonths: 6 });
  await request(app)
    .post(`/loans/${loan.body.id}/approve`)
    .set('Authorization', `Bearer ${token}`);
  return loan.body.id as number;
}

export function pay(token: string, key: string | null, body: object) {
  const req = request(app)
    .post('/payments')
    .set('Authorization', `Bearer ${token}`);
  if (key) req.set('Idempotency-Key', key);
  return req.send(body);
}
