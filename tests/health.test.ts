import request from 'supertest';
import { expect } from 'chai';
import { app } from '../src/app';

describe('GET /health', () => {
  it('returns 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).to.equal(200);
    expect(res.body.status).to.equal('ok');
  });
});