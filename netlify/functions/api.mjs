import { getStore } from '@netlify/blobs';

const defaultGifts = [
  { id: 1, name: "Jogo de panelas", limit: 2, chosenBy: [] },
  { id: 2, name: "Frigideira", limit: 1, chosenBy: [] },
  { id: 3, name: "Assadeiras e formas", limit: 1, chosenBy: [] },
  { id: 4, name: "Panela de pressão", limit: 1, chosenBy: [] },
  { id: 5, name: "Travessas", limit: 2, chosenBy: [] },
  { id: 6, name: "Jogo de pratos", limit: 2, chosenBy: [] },
  { id: 7, name: "Copos e taças", limit: 2, chosenBy: [] },
  { id: 8, name: "Xícaras", limit: 1, chosenBy: [] },
  { id: 9, name: "Talheres", limit: 2, chosenBy: [] },
  { id: 10, name: "Potes para mantimentos", limit: 1, chosenBy: [] },
  { id: 11, name: "Jarra", limit: 2, chosenBy: [] },
  { id: 12, name: "Tábua de corte", limit: 1, chosenBy: [] },
  { id: 13, name: "Escorredor de macarrão", limit: 1, chosenBy: [] },
  { id: 14, name: "Ralador", limit: 1, chosenBy: [] },
  { id: 15, name: "Peneiras", limit: 1, chosenBy: [] },
  { id: 16, name: "Espremedor de alho", limit: 1, chosenBy: [] },
  { id: 17, name: "Colher de pau e espátulas", limit: 1, chosenBy: [] },
  { id: 18, name: "Concha e escumadeira", limit: 1, chosenBy: [] },
  { id: 19, name: "Fouet (batedor de arame)", limit: 1, chosenBy: [] },
  { id: 20, name: "Abridor de latas e garrafas", limit: 1, chosenBy: [] },
  { id: 21, name: "Panos de prato", limit: 1, chosenBy: [] },
  { id: 22, name: "Toalha de mesa", limit: 1, chosenBy: [] },
  { id: 23, name: "Avental", limit: 1, chosenBy: [] },
  { id: 24, name: "Lixeira", limit: 1, chosenBy: [] },
  { id: 25, name: "Porta-temperos", limit: 1, chosenBy: [] },
  { id: 26, name: "Liquidificador", limit: 1, chosenBy: [] },
  { id: 27, name: "Cafeteira", limit: 1, chosenBy: [] },
  { id: 28, name: "Chaleira elétrica", limit: 1, chosenBy: [] },
  { id: 29, name: "Sanduicheira", limit: 1, chosenBy: [] },
  { id: 30, name: "Mixer", limit: 1, chosenBy: [] },
  { id: 31, name: "Contribuição via Pix", limit: 2, chosenBy: [] }
];

export const handler = async (event, context) => {
  const store = getStore('gifts-store');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      let gifts = await store.get('gifts_list', { type: 'json' });
      if (!gifts) {
        await store.setJSON('gifts_list', defaultGifts);
        gifts = defaultGifts;
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(gifts)
      };
    }

    if (event.httpMethod === 'POST') {
      const { id, guestName } = JSON.parse(event.body);

      if (!id || !guestName || guestName.trim() === '') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ID do presente e nome do convidado são obrigatórios.' })
        };
      }

      let gifts = await store.get('gifts_list', { type: 'json' });
      if (!gifts) {
        gifts = defaultGifts;
      }

      const giftIndex = gifts.findIndex(g => g.id === parseInt(id));
      if (giftIndex === -1) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Presente não encontrado.' })
        };
      }

      const gift = gifts[giftIndex];
      if (!Array.isArray(gift.chosenBy)) {
        gift.chosenBy = gift.chosenBy ? [gift.chosenBy] : [];
      }

      const chosenCount = gift.chosenBy.length;
      const limit = gift.limit || 1;

      if (chosenCount >= limit) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Este presente já foi escolhido o limite máximo de ${limit} vez(es).` 
          })
        };
      }

      if (gift.chosenBy.includes(guestName.trim())) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Você já reservou este presente com este nome.' })
        };
      }

      gift.chosenBy.push(guestName.trim());
      gift.chosenAt = new Date().toISOString();

      await store.setJSON('gifts_list', gifts);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, gift })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido.' })
    };

  } catch (error) {
    console.error('Erro na função serverless:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno no banco de dados do Netlify.' })
    };
  }
};
