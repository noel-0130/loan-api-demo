import { initSchema, closePool } from '../src/db';

before(async () => {
  await initSchema();
});

after(async () => {
  await closePool();
});
