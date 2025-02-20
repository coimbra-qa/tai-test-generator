// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const multer = require('multer');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const fs = require('fs');
const path = require('path');
const upload = multer({ dest: 'uploads/' });
const app = express();
const PORT = 3000;

// Definindo o motor de templates
app.set('view engine', 'ejs');

// Configurando o diretório de views
app.set('views', './views');

// Middleware para parse de dados do corpo da requisição
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// Rota para a página inicial
app.get('/', (req, res) => {
  res.render('index');
});

// Função para formatar o texto em JSON
function formatToJSON(testesGerados) {
  // console.log('Texto gerado para JSON:', testesGerados); // Removido o log do texto gerado
  const testes = testesGerados.split('\n\n').map((teste, index) => {
    const lines = teste.split('\n');
    if (lines.length < 4) {
      console.error(`Formato inesperado no caso de teste ${index + 1}:`, teste);
      return null;
    }
    const [titleLine, preconditionLine, descriptionLine, ...stepsLines] = lines;
    const title = titleLine ? titleLine.replace('Título: ', '').trim() : '';
    const precondition = preconditionLine ? preconditionLine.replace('Precondição: ', '').trim() : '';
    const description = descriptionLine ? descriptionLine.replace('Descrição: ', '').trim() : '';
    const steps = stepsLines.slice(1, -1).map((step, i) => step ? step.replace('-', '').trim() : ''); // Ajuste aqui
    const expectResult = stepsLines[stepsLines.length - 1] ? stepsLines[stepsLines.length - 1].replace('Resultado esperado: ', '').trim() : '';
    return {
      [`test-${index + 1}`]: {
        title,
        precondition,
        description,
        steps: steps.reduce((acc, step, i) => {
          acc[`${i + 1}`] = step;
          return acc;
        }, {}),
        expectResult
      }
    };
  }).filter(teste => teste !== null);
  return Object.assign({}, ...testes);
}

// Função para formatar o texto em DOCX
function formatToDOCX(testesGerados) {
  // console.log('Texto gerado para DOCX:', testesGerados); // Removido o log do texto gerado
  const paragraphs = testesGerados.split('\n\n').map((teste, index) => {
    const lines = teste.split('\n');
    if (lines.length < 3) {
      console.error(`Formato inesperado no caso de teste ${index + 1}:`, teste);
      return null;
    }

    const [titleLine, descriptionLine, ...stepsLines] = lines;
    const title = titleLine ? titleLine.replace('Título: ', '').trim() : '';
    const description = descriptionLine ? descriptionLine.replace('Descrição: ', '').trim() : '';
    const steps = stepsLines.slice(0, -1).map((step, i) => step ? `${i + 1}. ${step.replace('-', '').trim()}` : '').join('\n');
    const expectResult = stepsLines[stepsLines.length - 1] ? stepsLines[stepsLines.length - 1].replace('Resultado Esperado: ', '').trim() : '';

    return new Paragraph({
      children: [
        new TextRun({ text: `Caso de teste ${index + 1}`, bold: true }),
        new TextRun('\nTítulo: ' + title),
        new TextRun('\nDescrição: ' + description),
        new TextRun('\nPassos:\n' + steps),
        new TextRun('\nResultado Esperado: ' + expectResult)
      ]
    });
  }).filter(paragraph => paragraph !== null);

  return paragraphs;
}

// Função para formatar o texto em TXT
function formatToTXT(testesGerados) {
  // console.log('Texto gerado para TXT:', testesGerados); // Removido o log do texto gerado
  return testesGerados.split('\n\n').map((teste, index) => {
    const lines = teste.split('\n');
    if (lines.length < 4) {
      console.error(`Formato inesperado no caso de teste ${index + 1}:`, teste);
      return null;
    }

    const [titleLine, preconditionLine, descriptionLine, ...stepsLines] = lines;
    const title = titleLine ? titleLine.replace('Título: ', '').trim() : '';
    const precondition = preconditionLine ? preconditionLine.replace('Precondição: ', '').trim() : '';
    const description = descriptionLine ? descriptionLine.replace('Descrição: ', '').trim() : '';
    const steps = stepsLines.slice(1, -1).map((step, i) => step ? `${i + 1}. ${step.replace(/^\d+\.\s*/, '').trim()}` : '').join('\n'); // Ajuste aqui
    const expectResult = stepsLines[stepsLines.length - 1] ? stepsLines[stepsLines.length - 1].replace('Resultado esperado: ', '').trim() : '';
    return `Título: ${title}\nPrecondição: ${precondition}\nDescrição: ${description}\nPassos:\n${steps}\nResultado esperado: ${expectResult}\n`;
  }).filter(teste => teste !== null).join('\n\n');
}

// Rota para processar o contexto e gerar os testes
app.post('/gerar-testes', upload.single('arquivo'), async (req, res) => {
  const contexto = req.file ? req.file.path : req.body.contexto;
  
  try {
    console.log('Iniciando requisição para OpenAI...');
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

    console.log('Resposta recebida com sucesso');
    const testesGerados = response.data.choices[0].message.content;

    // Verificar o tipo de download solicitado
    const downloadType = req.body.downloadType;

    if (downloadType === 'txt') {
      // Gerar arquivo TXT
      const txtContent = formatToTXT(testesGerados);
      const filePath = path.join(__dirname, 'testes.txt');
      fs.writeFileSync(filePath, txtContent);

      res.download(filePath, 'testes.txt', (err) => {
        if (err) {
          console.error('Erro ao baixar o arquivo TXT:', err);
        }
        fs.unlinkSync(filePath); // Excluir o arquivo após o download
      });
    } else {
      // Gerar arquivo JSON
      const jsonFilePath = path.join(__dirname, 'testes.json');
      const formattedJSON = formatToJSON(testesGerados);
      fs.writeFileSync(jsonFilePath, JSON.stringify(formattedJSON, null, 2));

      res.download(jsonFilePath, 'testes.json', (err) => {
        if (err) {
          console.error('Erro ao baixar o arquivo JSON:', err);
        }
        fs.unlinkSync(jsonFilePath); // Excluir o arquivo após o download
      });
    }
  } catch (error) {
    console.error('Erro completo:', error);
    console.error('Detalhes da resposta:', error.response?.data);
    console.error('Status do erro:', error.response?.status);
    res.status(500).send(`Erro ao gerar casos de teste: ${error.response?.data?.error?.message || error.message}`);
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
