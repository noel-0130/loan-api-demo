import request from 'supertest';
import { expect } from 'chai';
import { app } from '../src/app';

describe('Auth', () => {
  it('returns a JWT on valid login', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'juan', password: 'password123' });
    expect(res.status).to.equal(200);
    expect(res.body.token).to.be.a('string');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'juan', password: 'wrong' });
    expect(res.status).to.equal(401);
  });

  it('returns 400 on invalid login body', async () => {
    const res = await request(app).post('/login').send({});
    expect(res.status).to.equal(400);
  });

  it('allows access to a protected route with a valid token', async () => {
    const login = await request(app)
      .post('/login')
      .send({ username: 'juan', password: 'password123' });
    const res = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).to.equal(200);
    expect(res.body.userId).to.equal('juan');
  });

  it('returns 401 on protected route without token', async () => {
    const res = await request(app).get('/me');
    expect(res.status).to.equal(401);
  });

  it('returns 401 on invalid token', async () => {
    const res = await request(app)
      .get('/me')
      .set('Authorization', 'Bearer fake.token.here');
    expect(res.status).to.equal(401);
  });
});
