const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GIFTS_FILE = path.join(__dirname, 'gifts.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read gifts
function readGifts() {
  try {
    const data = fs.readFileSync(GIFTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading gifts file:', error);
    return [];
  }
}

// Helper to write gifts
function writeGifts(gifts) {
  try {
    fs.writeFileSync(GIFTS_FILE, JSON.stringify(gifts, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing gifts file:', error);
    return false;
  }
}

// API: Get all gifts
app.get('/api/gifts', (req, res) => {
  const gifts = readGifts();
  res.json(gifts);
});

// API: Claim a gift
app.post('/api/gifts/claim', (req, res) => {
  const { id, guestName } = req.body;

  if (!id || !guestName || guestName.trim() === '') {
    return res.status(400).json({ error: 'ID do presente e nome do convidado são obrigatórios.' });
  }

  const gifts = readGifts();
  const giftIndex = gifts.findIndex(g => g.id === parseInt(id));

  if (giftIndex === -1) {
    return res.status(404).json({ error: 'Presente não encontrado.' });
  }

  const gift = gifts[giftIndex];
  
  // Initialize chosenBy as array if it is not
  if (!Array.isArray(gift.chosenBy)) {
    gift.chosenBy = gift.chosenBy ? [gift.chosenBy] : [];
  }

  const chosenCount = gift.chosenBy.length;
  const limit = gift.limit || 1;

  if (chosenCount >= limit) {
    return res.status(400).json({ 
      error: `Este presente já foi escolhido o limite máximo de ${limit} vez(es). Por favor, escolha outro.` 
    });
  }

  if (gift.chosenBy.includes(guestName.trim())) {
    return res.status(400).json({ error: 'Você já reservou este presente com este nome.' });
  }

  // Mark as chosen and append guest name
  gift.chosenBy.push(guestName.trim());
  gift.chosenAt = new Date().toISOString();

  if (writeGifts(gifts)) {
    res.json({ success: true, gift: gift });
  } else {
    res.status(500).json({ error: 'Erro ao salvar a escolha do presente. Tente novamente.' });
  }
});

// API: Reset all gifts (admin helper)
app.post('/api/gifts/reset', (req, res) => {
  const gifts = readGifts();
  const resetGifts = gifts.map(g => ({
    ...g,
    chosenBy: [],
    chosenAt: null
  }));

  if (writeGifts(resetGifts)) {
    res.json({ success: true, message: 'Lista de presentes resetada com sucesso!' });
  } else {
    res.status(500).json({ error: 'Erro ao resetar a lista de presentes.' });
  }
});

// Catch-all route to serve frontend index.html for client routing if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse localmente em: http://localhost:${PORT}`);
});
