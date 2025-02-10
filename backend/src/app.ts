import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chat';
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRoutes);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});