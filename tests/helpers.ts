import request from 'supertest';
import { app } from '../src/app';

export async function getToken(username = 'juan') {
  const res = await request(app)
    .post('/login')
    .send({ username, password: 'password123' });
  return res.body.token as string;
}
