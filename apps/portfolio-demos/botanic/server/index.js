import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const TREFLE_TOKEN = process.env.TREFLE_TOKEN;

app.use(cors());
app.use(express.json());

app.get('/api/plants', async (req, res) => {
  try {
    const search = req.query.search || '';
    const url = `https://trefle.io/api/v1/plants/search?token=${TREFLE_TOKEN}&q=${encodeURIComponent(search)}`;

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error('Fehler:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
export default app;