const algorithmia       = require('algorithmia');
const algorithmiaApiKey = require('../credencials/algorithmia.json').apiKey;
const sentenceBpundaryDetecition = require('sbd');

async function robot(content) {
    await fetchContentFromWikipedia(content);
    sanitizeContent(content);
    breakContentIntoSentences(content);

    async function fetchContentFromWikipedia(content) {
        const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey);
        const wikipediaAlgothm         = algorithmiaAuthenticated.algo("web/WikipediaParser/0.1.2?timeout=300"); 
        const wikipediaResponse        = await wikipediaAlgothm.pipe(content.searchTerm);
        const wikipediaContent         = wikipediaResponse.get();

        content.sourceContentOriginal = wikipediaContent.content;
    }

    function sanitizeContent(content) {
        const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal);
        const withoutDatesInParentheses    = removeDatesInParentheses(withoutBlankLinesAndMarkdown);

        content.sourceContentSanitized = withoutDatesInParentheses;

        function removeBlankLinesAndMarkdown(text) {
            const allLines = text.split('\n');

            const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
                //verifica se a linha tem tamanho 0, se tiver remove
                if(line.trim().length == 0 || line.trim().startsWith('=')) {
                    return false;
                }
                return true;
            });

            return withoutBlankLinesAndMarkdown.join(' ');
        }

        function removeDatesInParentheses(text) {
            return text.replace(/|((?:|([^()]*|)|[^()])*|)/gm, '' );
        }
        
    }

    function breakContentIntoSentences(content) {
        content.sentences = [];

        const sentences = sentenceBpundaryDetecition.sentences(content.sourceContentSanitized);

        sentences.forEach((sentence) => {
            content.sentence.push({
                text: sentence,
                keywords: [],
                images: []
            })
        });
    }
}

module.exports = robot;