const imageDownloader = require('image-downloader'); 
const google          = require('googleapis').google;
const customSearch    = google.customsearch('v1'); 
const state           = require('./state');

const googleSearchCredencials = require('../credencials/google-search.json');

async function robot() {
  const content     = state.load();
  
  await fetchImageOfAllSentencens(content);
  await downloadAllImages(content);

  state.save(content);

//   console.dir(content, { depth: null });

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
  
  async function downloadAllImages(content) {
    content.downloadedImages       = [];
    
    for(let i = 0; i < content.sentences.length; i++) {
        const images = content.sentences[i].images;

        for(let j = 0; j < images.length; j++) {
            const imageUrl = images[j];

            try {
                if(content.downloadedImages.includes(imageUrl)) {
                    throw new Error('Imagem já foi baixada');
                }
                await downloadAndSaveImage(imageUrl, `${i}-original.png`);
                content.downloadedImages.push(imageUrl);
                console.log(`> [${i}] [${j}] Baixou imagem com sucesso: ${imageUrl}`);
                break;
            } catch(error) {
              console.log(`> [${i}] [${j}] Erro ao baixar (${imageUrl}): ${error}`);
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