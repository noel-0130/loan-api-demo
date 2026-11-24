import { app } from './app';
import { initSchema } from './db';

initSchema()
  .then(() => {
    app.listen(3000, () => console.log('Running on port 3000'));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
