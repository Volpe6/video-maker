const imageDownloader = require('image-downloader'); 
const gm              = require('gm').subClass({imageMagick: true});
const path            = require('path');
const google          = require('googleapis').google;
const customSearch    = google.customsearch('v1'); 
const state           = require('./state');

const googleSearchCredencials = require('../credencials/google-search.json');

const rootPath = path.resolve(__dirname, '..');

const fromRoot = relPath => path.resolve(rootPath, relPath);

async function robot() {
  const content     = state.load();
  
  await fetchImageOfAllSentencens(content);
  await downloadAllImages(content);
  await convertAllImages(content);
  await createAllSentenceImages(content);
  await createYouTubeThumbnail();
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

  async function convertAllImages(content) {
    for(let i = 0; i < content.sentences.length; i++) {
      await convertImage(i);
    }
  }

  async function convertImage(sentenceIndex) {
      return new Promise((resolve, reject) => {
        const inputFile  = fromRoot(`./content/${sentenceIndex}-original.png[0]`);
        const outputFile = fromRoot(`./content/${sentenceIndex}-converted.png`);
        
        const width  = 1920;
        const height = 1080;

        gm()
        .in(inputFile)
        .out('(')
          .out('-clone')
          .out('0')
          .out('-background', 'white')
          .out('-blur', '0x9')
          .out('-resize', `${width}x${height}^`)
        .out(')')
        .out('(')
          .out('-clone')
          .out('0')
          .out('-background', 'white')
          .out('-resize', `${width}x${height}`)
        .out(')')
        .out('-delete', '0')
        .out('-gravity', 'center')
        .out('-compose', 'over')
        .out('-composite')
        .out('-extent', `${width}x${height}`)
        .write(outputFile, (error) => {
          if (error) {
            return reject(error);
          }

          console.log(`> [video-robot] Image converted: ${outputFile}`)
          resolve();
        });
          
      });
  }

  async function createAllSentenceImages(content) {
    
    for(let i = 0; i < content.sentences.length; i++) {
      await createSentenceImage(i, content.sentences[i].text);
    }
  }

  async function createSentenceImage(sentenceIndex, sentenceText) {
    return new Promise((resolve, reject) => {
      const outputFile = fromRoot(`./content/${sentenceIndex}-sentence.png`);
      
      const templateSettings = {
        0: {
          size: '1920x400',
          gravity: 'center'
        },
        1: {
          size: '1920x1080',
          gravity: 'center'
        },
        2: {
          size: '800x1080',
          gravity: 'west'
        },
        3: {
          size: '1920x400',
          gravity: 'center'
        },
        4: {
          size: '1920x1080',
          gravity: 'center'
        },
        5: {
          size: '800x1080',
          gravity: 'west'
        },
        6: {
          size: '1920x400',
          gravity: 'west'
        }  
      };

      gm()
        .out('-size', templateSettings[sentenceIndex].size)
        .out('-gravity', templateSettings[sentenceIndex].gravity)
        .out('-background', 'transparent')
        .out('-fill', 'white')
        .out('-kerning', '-1')
        .out(`caption:${sentenceText}`)
        .write(outputFile, (error) => {
          if(error) {
            return reject(error);
          }
          console.log(`> sentence created: ${outputFile}`);
          resolve();
        });
    });
  }

  async function createYouTubeThumbnail() {
    return new Promise((resolve, reject) => {
      gm()
      .in(fromRoot('./content/0-converted.png'))
      .write(fromRoot('./content/youtube-thumbnail.jpg'), (error) => {
        if (error) {
          return reject(error);
        }

        console.log('> [video-robot] YouTube thumbnail created')
        resolve();
      })
    });
  }
}

module.exports = robot;