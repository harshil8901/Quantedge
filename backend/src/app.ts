import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import valuationRoutes from './routes/valuation';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.use('/api/valuation', valuationRoutes);

app.get('/', (req, res) => {
  res.send('QuantEdge Backend');
});

app.listen(PORT, () => {
  console.log(`QuantEdge backend running on port ${PORT}`);
});
