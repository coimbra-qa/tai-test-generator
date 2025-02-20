const axios = require('axios');

async function generateTests(contexto) {
    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um assistente que gera casos de teste de software em português com base no contexto fornecido. As respostas devem estar no seguinte formato: Título: [título do caso de teste] Precondição: [precondição do caso de teste] Descrição: [descrição do caso de teste] Passos: [passos para realização do teste] Resultado esperado: [resultado do teste]'
                },
                {
                    role: 'user',
                    content: contexto
                }
            ],
            temperature: 0.7,
            max_tokens: 1500,
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            }
        }
    );

    return response.data.choices[0].message.content;
}

module.exports = { generateTests };