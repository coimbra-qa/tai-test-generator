const express = require('express');
const multer = require('multer');
const { generateTests } = require('../services/services'); // Ajuste o caminho conforme necessário
const { formatToJSON, formatToTXT } = require('../formatters/formatters');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', (req, res) => {
  res.render('index');
});

router.post('/gerar-testes', upload.single('arquivo'), async (req, res) => {
  const contexto = req.file ? req.file.path : req.body.contexto;

  try {
    const testesGerados = await generateTests(contexto);
    const downloadType = req.body.downloadType;

    if (downloadType === 'txt') {
      const txtContent = formatToTXT(testesGerados);
      const filePath = path.join(__dirname, 'testes.txt');
      fs.writeFileSync(filePath, txtContent);

      res.download(filePath, 'testes.txt', (err) => {
        if (err) {
          console.error('Erro ao baixar o arquivo TXT:', err);
        }
        fs.unlinkSync(filePath);
      });
    } else {
      const jsonFilePath = path.join(__dirname, 'testes.json');
      const formattedJSON = formatToJSON(testesGerados);
      fs.writeFileSync(jsonFilePath, JSON.stringify(formattedJSON, null, 2));

      res.download(jsonFilePath, 'testes.json', (err) => {
        if (err) {
          console.error('Erro ao baixar o arquivo JSON:', err);
        }
        fs.unlinkSync(jsonFilePath);
      });
    }
  } catch (error) {
    console.error('Erro completo:', error);
    res.status(500).send(`Erro ao gerar casos de teste: ${error.message}`);
  }
});

module.exports = router;