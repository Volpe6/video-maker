const algorithmia                = require('algorithmia');
const algorithmiaApiKey          = require('../credencials/algorithmia.json').apiKey;
const sentenceBpundaryDetecition = require('sbd');
const state                      = require('./state');
const { apikey: watsonApiKey, url: watsonURL } = require('../credencials/watson-nlu.json');

const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1.js');
const { IamAuthenticator  } = require('ibm-watson/auth');

const nlu = new NaturalLanguageUnderstandingV1({
    version: '2019-07-12',
    authenticator: new IamAuthenticator({
        apikey: watsonApiKey
    }),
    url: watsonURL
});

async function robot() {
    console.log(`> [text-robot] Starting...`);
    const content = state.load();

    await fetchContentFromWikipedia(content);
    sanitizeContent(content);
    breakContentIntoSentences(content);
    limitmaximumSentences(content);
    await fetchKeywordsOfAllSentences(content);

    state.save(content);

    async function fetchContentFromWikipedia(content) {
        console.log(`> [text-robot] Fething content from wikipedia`);
        const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey);
        const wikipediaAlgothm         = algorithmiaAuthenticated.algo("web/WikipediaParser/0.1.2?timeout=300"); 
        const wikipediaResponse        = await wikipediaAlgothm.pipe(`${content.prefix} ${content.searchTerm}`);
        const wikipediaContent         = wikipediaResponse.get();

        content.sourceContentOriginal = wikipediaContent.content;
        console.log('> [text-robot] Fething done!');
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
            content.sentences.push({
                text: sentence,
                keywords: [],
                images: []
            })
        });
    }

    function limitmaximumSentences(content) {
        content.sentences = content.sentences.slice(0, content.maximumSentences);
    }

    async function fetchKeywordsOfAllSentences(content) {
        console.log('> [text-robot] Starting to feth keywords from Watson');
       for(const sentence of content.sentences) {
        console.log('> [text-robot] Sentence: ' + sentence.text);
        sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text);
        console.log('> [text-robot] Keywords: ' + sentence.keywords.join(', ') + "\n");
       }
    }

    async function fetchWatsonAndReturnKeywords(sentence) {
        return new Promise((resolve, reject) => {
            nlu.analyze({
                text: sentence,
                features: {
                    keywords: {}
                }
            }, (error, response) => {
                if(error) {
                    throw error;
                }
                
                const keywords = response.result.keywords.map((keyword) => {
                    return keyword.text;
                });
    
                resolve(keywords);
            });
            
        });
    }
}

module.exports = robot;