import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import authRouter from './routes/auth';
import webhookRouter from './routes/webhook';
import ordersRouter from './routes/orders';
import { initDb } from './db';

const app = express();

// Enable CORS for frontend communication
app.use(cors());

// Middleware to parse incoming JSON requests
app.use(bodyParser.json());

// Initialize the database connection
initDb()
  .then(() => console.log('✅ DB connected'))
  .catch((err) => console.error('❌ DB connection failed', err));

// Define routes for various API endpoints
app.use('/api/auth', authRouter);  // Authentication-related routes
app.use('/api/integrations/woocommerce', webhookRouter); // WooCommerce webhooks
app.use('/api/orders', ordersRouter); // Order-related routes

// A simple health check route
app.get('/', (_, res) => res.send('WaterDist API running'));

export default app;
