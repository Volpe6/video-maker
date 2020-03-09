const state   = require('./state');
const google  = require('googleapis').google;
const youtube = google.youtube({ version: 'v3'}); 
const OAuth2  = google.auth.OAuth2;
const express = require('express');

async function robot() {
    const content = state.load();

    await authenticationWithOAuth();
    const videoInformation = await uploadVideo(content);
    await uploadThumbnail(videoInformation);

    async function authenticationWithOAuth() {
        const webServer   = await startWebServer();
        const OAuthClient = await createOAuthClient();
        requestUserConsent(OAuthClient);
        const authorizationToken = await waitForGoogleCallback(webServer);
        await requestGoogleForAccessTokens(OAuthClient, authorizationToken);
        await setGlobalGoogleAuthentication();
        await stopWebSever();

        async function startWebServer() {
            return new Promise((resolve, reject) => {
                const port = 5000;
                const app  = express();

                const server = app.listen(port, () => {
                    console.log(`> listening on http://localhost:${port}`);

                    resolve({
                        app,
                        server
                    });
                });
            });
        }

        async function createOAuthClient() {
            const credencials = require('../credencials/google-youtube.json');

            const OAuthClient = new OAuth2(
                credencials.web.client_id,
                credencials.web.client_secret,
                credencials.web.redirect_uris[0]
            );

            return OAuthClient;
        }

        function requestUserConsent(OAuthClient) {
            const consentUrl = OAuthClient.generateAuthUrl({
                access_type: 'offline',
                scope: ['https://www.googleapis.com/auth/youtube']
            });

            console.log(`> Please give your consent: ${consentUrl}`);
        }

        async function waitForGoogleCallback(webServer) {
            return new Promise((resolve, reject) => {
                console.log('> Waiting for user censent...');

                webServer.app.get('/oauth2callback', (req, res) => {
                    const authCode = req.query.code;
                    console.log(`> consent given: ${authCode}`);

                    res.send('<h1>Thank you</h1><p>Now close this tab</p>');
                    resolve(authCode);
                });
            });
        }

        async function requestGoogleForAccessTokens(OAuthClient, authorizationToken) {
            return new Promise((resolve, reject) => {
                OAuthClient.getToken(authorizationToken, (error, tokens) => {
                    if(error) {
                        return reject(error);
                    }

                    console.log('> Acess tokes received:');
                    console.log(tokens);

                    OAuthClient.setCredentials(tokens);
                    resolve();
                });
            });
        }

        async function setGlobalGoogleAuthentication(OAuthClient) {
            google.options({
                auth: OAuthClient
            });
        }

        async function startWebServer() {
            return new Promise((resolve, reject) => {
                webServer.server.close(() => {
                    resolve();
                });
            });
        }

        async function uploadVideo(content) {
            const videoFilePath    = './content/output.mov';
            const videoFileSize    = fs.statSync(videoFilePath).size;
            const videoTitle       = `${content.prefix} ${content.searchTerm}`;
            const videoTags        = [content.searchTerm, ...content.sentences[0].keywords]
            const videoDescription = content.sentences.map((sentence) => {
                return sentence.text;
            }).join('\n\n');

            const requestParameters = {
                part: 'snippet, status', 
                requestBody: {
                    snippet: {
                        title: videoTitle,
                        description: videoDescription,
                        tags: videoTags
                    },
                    status: {
                        privacyStatus: 'unlisted'
                    }
                },
                media: {
                    body: fs.createReadStream(videoFilePath)
                }
            }

            const youtubeResponse = await youtube.videos.insert(requestParameters, {
                onUploadProgress: onUploadProgress
            });

            console.log(`> Video avaliable at: https://youtu.be/${youtubeResponse.data.id}`);
            return youtubeResponse.data;

            function onUploadProgress(event) {
                const progress = Math.round((event.bytesRead / videoFileSize) * 100);
                console.log(`> ${progress}% completed`);
            }
            
        }
    }

    async function uploadThumbnail(videoInformation) {
        const videoId                = videoInformation.id;
        const videoThumbnailFilePath = './content/youtube-thumbnail.jpg';
    }
}

module.exports = robot;