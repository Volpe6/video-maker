const gm    = require('gm').subClass({imageMagick: true});
const path  = require('path');
const state = require('./state');
const spawn = require('child_process').spawn;

const rootPath = path.resolve(__dirname, '..');

const fromRoot = relPath => path.resolve(rootPath, relPath);


async function robot() {

    await convertAllImages(content);
    await createAllSentenceImages(content);
    // await createYouTubeThumbnail();
    // await createAfterEffectScript(content);
    // await renderVideoWithAfterEffects();

    state.save(content);

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
    
    async function createAfterEffectScript(content) {
       await state.saveScript(content);
    }

    //vai dar erro pelo local do adobe e por eu nao ter after effects
    async function renderVideoWithAfterEffects() {
        return new Promise((resolve, reject) => {
            const aerenderFilePath    = '/Applications/Adobe After Effects CC 2019/aernder';
            const templateFilePath    = `${rootPath}/templates/1/template.aep`;
            const destinationFilePath = `${rootPath}/content/output.mov`; 

            console.log('> Starting After Effects');

            const aerender = spawn(aerenderFilePath, [
                '-comp', 'main',
                '-project', templateFilePath,
                '-output', destinationFilePath
            ]);

            aerender.stdout.on('data', (data) => {
                process.stdout.write(data);
            });

            aerender.on('close', () => {
                console.log('> After Effects closed');
                resolve();
            });

        });
    }
}

module.exports = robot;