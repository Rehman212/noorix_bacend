import 'dotenv/config';
import { createExpressApp } from './server';

async function bootstrap() {
  const server = await createExpressApp();
  const port = Number(process.env.PORT ?? 4000);
  server.listen(port, '0.0.0.0', () => {
    console.log(`NOORIX API running on http://localhost:${port}/api`);
  });
}

bootstrap().catch((err) => {
  console.error('API bootstrap failed:', err);
  process.exit(1);
});
