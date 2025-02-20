function formatToJSON(testesGerados) {
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
        const steps = stepsLines.slice(1, -1).map((step, i) => step ? step.replace('-', '').trim() : '');
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

function formatToTXT(testesGerados) {
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
        const steps = stepsLines.slice(1, -1).map((step, i) => step ? `${i + 1}. ${step.replace(/^\d+\.\s*/, '').trim()}` : '').join('\n');
        const expectResult = stepsLines[stepsLines.length - 1] ? stepsLines[stepsLines.length - 1].replace('Resultado esperado: ', '').trim() : '';
        return `Título: ${title}\nPrecondição: ${precondition}\nDescrição: ${description}\nPassos:\n${steps}\nResultado esperado: ${expectResult}\n`;
    }).filter(teste => teste !== null).join('\n\n');
}

module.exports = { formatToJSON, formatToTXT };