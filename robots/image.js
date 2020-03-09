const imageDownloader = require('image-downloader'); 
const google          = require('googleapis').google;
const customSearch    = google.customsearch('v1'); 
const state           = require('./state');

const googleSearchCredencials = require('../credencials/google-search.json');

async function robot() {
  console.log('> [image-robot] Starting...');
  const content     = state.load();
  
  await fetchImageOfAllSentencens(content);
  await downloadAllImages(content);

  state.save(content);

  async function fetchImageOfAllSentencens(content) {
    for(let i = 0; i < content.sentences.length; i++) {
      let query;
      if(i == 0) {
        query = `${content.searchTerm}`;
      } else {
        query = `${content.searchTerm} ${content.sentences[i].keywords[0]}`;
      }
      console.log('> > [image-robot] Querying Google images with: ' + '"' + query + '"');
      content.sentences[i].images = await fethGoogleAndReturnImagesLinks(query);

      content.sentences[i].googleSearchQuery = query;
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
  
  async function downloadAllImages(content) {
    content.downloadedImages       = [];
    
    for(let i = 0; i < content.sentences.length; i++) {
        const images = content.sentences[i].images;

        for(let j = 0; j < images.length; j++) {
            const imageUrl = images[j];

            try {
                if(content.downloadedImages.includes(imageUrl)) {
                    throw new Error('> > [image-robot] Imagem já foi baixada');
                }
                await downloadAndSaveImage(imageUrl, `${i}-original.png`);
                content.downloadedImages.push(imageUrl);
                console.log(`> [image-robot] [${i}] [${j}] Baixou imagem com sucesso: ${imageUrl}`);
                break;
            } catch(error) {
              console.log(`> [image-robot] [${i}] [${j}] Erro ao baixar (${imageUrl}): ${error}`);
            }
        }
    }
  }
  
  async function downloadAndSaveImage(url, fileName) {
    return imageDownloader.image({
        url: url,
        dest: `./content/${fileName}`
    });
  }
}

module.exports = robot;