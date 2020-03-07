const readline = require('readline-sync'); 
const robots = {
    text: require('./robots/text')
};

async function start() {
    const content = {
        maximumSentences: 7
    };

    content.searchTerm = askAndReturnSearchTerm();
    content.prefix     = askAndReturnPrefix();
    
    await robots.text(content);

    function askAndReturnSearchTerm() {
        //termo da busca na wikipedia
        return readline.question('Type a Wikipedia search term: ');
    }

    function askAndReturnPrefix() {
        //prefixos para uma pesquisa mais completa no google
        const prefixes = ['Who is', 'What is', 'The history of'];
        //indice do prefixo escolhido
        const selectedPrefixIndex = readline.keyInSelect(prefixes, 'Choose one option: ');
        //texto referente ao indice do prefixo
        const selectedPrefixText  = prefixes[selectedPrefixIndex];

        return selectedPrefixText;
    }

    console.log(JSON.stringify(content, null , 4));
}

start();