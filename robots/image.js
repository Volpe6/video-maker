const google       = require('googleapis').google;
const customSearch = google.customsearch('v1'); 
const state        = require('./state');

const googleSearchCredencials = require('../credencials/google-search.json');

async function robot() {
  const content     = state.load();
  
  await fetchImageOfAllSentencens(content);

  state.save(content);

  console.dir(content, { depth: null });

  async function fetchImageOfAllSentencens(content) {
    for(const sentence of content.sentences) {
      const query = `${content.searchTerm} ${sentence.keywords[0]}`;
      sentence.images = await fethGoogleAndReturnImagesLinks(query);

      sentence.googleSearchQuery = query;
    }
  }

  async function fethGoogleAndReturnImagesLinks(query) {
    const response = await customSearch.cse.list({
        auth: googleSearchCredencials.apikey,
        cx: googleSearchCredencials.searchEngineId,
        searchType: 'image',
        imgSize: 'huge',
        q: query,
        num: 2  
    });

    const imagesUrl = response.data.items.map((item) => {
        return item.link;
    });

    return imagesUrl;
  }

  process.exit(0);
}

module.exports = robot;