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
  // IDs 14 (Ralador) e 15 (Peneiras) removidos
  { id: 16, name: "Espremedor de alho", limit: 1, chosenBy: [] },
  { id: 17, name: "Colher de pau e espátulas", limit: 1, chosenBy: [] },
  // ID 18 (Concha e escumadeira) removido
  { id: 19, name: "Fouet (batedor de arame)", limit: 1, chosenBy: [] },
  // ID 20 (Abridor de latas e garrafas) removido
  { id: 21, name: "Panos de prato", limit: 1, chosenBy: [] },
  { id: 22, name: "Toalha de mesa", limit: 1, chosenBy: [] },
  // ID 23 (Avental) removido
  { id: 24, name: "Lixeira", limit: 1, chosenBy: [] },
  { id: 25, name: "Porta-temperos", limit: 1, chosenBy: [] },
  { id: 26, name: "Liquidificador", limit: 1, chosenBy: [] },
  { id: 27, name: "Cafeteira", limit: 1, chosenBy: [] },
  { id: 28, name: "Chaleira elétrica", limit: 1, chosenBy: [] },
  { id: 29, name: "Sanduicheira", limit: 1, chosenBy: [] },
  { id: 30, name: "Mixer", limit: 1, chosenBy: [] },
  { id: 31, name: "Contribuição via Pix", limit: 2, chosenBy: [] },
  // Novos presentes adicionados
  { id: 32, name: "Toalhas de banho e mesa", limit: 1, chosenBy: [] },
  { id: 33, name: "Espátulas de silicone", limit: 1, chosenBy: [] },
  { id: 34, name: "Suporte para braço de sofá", limit: 1, chosenBy: [] },
  { id: 35, name: "Garrafa térmica", limit: 1, chosenBy: [] },
  { id: 36, name: "Batedeira", limit: 1, chosenBy: [] },
  { id: 37, name: "Aspirador de pó", limit: 1, chosenBy: [] }
];

// Senha padrão para ações de administração
const ADMIN_PASSWORD = '1234';

export default async (request, context) => {
  const store = getStore('gifts-store');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  try {
    if (request.method === 'GET') {
      let gifts = await store.get('gifts_list', { type: 'json' });
      if (!gifts) {
        await store.setJSON('gifts_list', defaultGifts);
        gifts = defaultGifts;
      } else {
        // --- MIGRAÇÃO AUTOMÁTICA EM PRODUÇÃO ---
        // Se a lista no banco de dados na nuvem contiver o item Avental (ID 23),
        // roda a migração para a nova lista sem perder as marcações dos outros presentes.
        const containsAvental = gifts.some(g => g.id === 23);
        if (containsAvental) {
          console.log("Migrando banco de dados em nuvem para a nova lista de presentes...");
          
          // 1. Remove os presentes antigos (IDs 14, 15, 18, 20, 23)
          const idsToRemove = [14, 15, 18, 20, 23];
          gifts = gifts.filter(g => !idsToRemove.includes(g.id));
          
          // 2. Adiciona os presentes novos se não existirem
          const newItems = [
            { id: 32, name: "Toalhas de banho e mesa", limit: 1, chosenBy: [] },
            { id: 33, name: "Espátulas de silicone", limit: 1, chosenBy: [] },
            { id: 34, name: "Suporte para braço de sofá", limit: 1, chosenBy: [] },
            { id: 35, name: "Garrafa térmica", limit: 1, chosenBy: [] },
            { id: 36, name: "Batedeira", limit: 1, chosenBy: [] },
            { id: 37, name: "Aspirador de pó", limit: 1, chosenBy: [] }
          ];
          
          for (const item of newItems) {
            if (!gifts.some(g => g.id === item.id)) {
              gifts.push(item);
            }
          }
          
          // 3. Grava de volta no Netlify Blobs
          await store.setJSON('gifts_list', gifts);
        }
      }
      return new Response(JSON.stringify(gifts), { status: 200, headers });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { action, id, guestName, password } = body;

      // --- AÇÃO 1: REMOVER CONVIDADO (ADMINISTRADOR) ---
      if (action === 'release') {
        if (password !== ADMIN_PASSWORD) {
          return new Response(JSON.stringify({ error: 'Senha de administrador inválida.' }), {
            status: 401,
            headers
          });
        }

        let gifts = await store.get('gifts_list', { type: 'json' });
        if (!gifts) return new Response(JSON.stringify({ error: 'Banco vazio.' }), { status: 404, headers });

        const giftIndex = gifts.findIndex(g => g.id === parseInt(id));
        if (giftIndex === -1) {
          return new Response(JSON.stringify({ error: 'Presente não encontrado.' }), { status: 404, headers });
        }

        const gift = gifts[giftIndex];
        if (Array.isArray(gift.chosenBy)) {
          gift.chosenBy = gift.chosenBy.filter(name => name !== guestName);
        }

        await store.setJSON('gifts_list', gifts);
        return new Response(JSON.stringify({ success: true, gifts }), { status: 200, headers });
      }

      // --- AÇÃO 2: ESCOLHER PRESENTE (CONVIDADO) ---
      if (!id || !guestName || guestName.trim() === '') {
        return new Response(JSON.stringify({ error: 'ID do presente e nome do convidado são obrigatórios.' }), {
          status: 400,
          headers
        });
      }

      let gifts = await store.get('gifts_list', { type: 'json' });
      if (!gifts) {
        gifts = defaultGifts;
      }

      const giftIndex = gifts.findIndex(g => g.id === parseInt(id));
      if (giftIndex === -1) {
        return new Response(JSON.stringify({ error: 'Presente não encontrado.' }), {
          status: 404,
          headers
        });
      }

      const gift = gifts[giftIndex];
      if (!Array.isArray(gift.chosenBy)) {
        gift.chosenBy = gift.chosenBy ? [gift.chosenBy] : [];
      }

      const chosenCount = gift.chosenBy.length;
      const limit = gift.limit || 1;

      if (chosenCount >= limit) {
        return new Response(JSON.stringify({ 
          error: `Este presente já foi escolhido o limite máximo de ${limit} vez(es).` 
        }), {
          status: 400,
          headers
        });
      }

      if (gift.chosenBy.includes(guestName.trim())) {
        return new Response(JSON.stringify({ error: 'Você já reservou este presente com este nome.' }), {
          status: 400,
          headers
        });
      }

      gift.chosenBy.push(guestName.trim());
      gift.chosenAt = new Date().toISOString();

      await store.setJSON('gifts_list', gifts);

      return new Response(JSON.stringify({ success: true, gift }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido.' }), { status: 405, headers });

  } catch (error) {
    console.error('Erro na função serverless:', error);
    return new Response(JSON.stringify({ error: 'Erro interno no banco de dados do Netlify.' }), {
      status: 500,
      headers
    });
  }
};
