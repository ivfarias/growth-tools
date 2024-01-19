import express from 'express';
import bodyParser from 'body-parser';
import { fetchAppDetails, findTopCompetitors, fetchReviews, checkRank } from './src/appInfo.js';
import { fetchGoogleAdsKeywordIdeas } from './src/keywordAnalysis.js';

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.post('/fetch-app-details', async (req, res) => {
    const { platform, appId, country, languageCode } = req.body;
    try {
        const appDetails = await fetchAppDetails(platform, appId, country, languageCode);
        res.json(appDetails);
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

app.post('/fetch-keywords', async (req, res) => {
    const { userKeywords, languageCode, country } = req.body;
    try {
        const keywords = await fetchGoogleAdsKeywordIdeas(userKeywords, languageCode, country);
        res.json(keywords);
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

app.post('/fetch-reviews', async (req, res) => {
    const { platform, appId, country, languageCode } = req.body;
    try {
        const reviews = await fetchReviews(platform, appId, country, languageCode);
        res.json(reviews);
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

app.post('/find-top-competitors', async (req, res) => {
    const { platform, keywords, userAppId, country, languageCode } = req.body;
    try {
        const keywordArray = keywords.split(',').map(keyword => keyword.trim());
        const competitors = await findTopCompetitors(platform, keywordArray, userAppId, country, languageCode);
        res.json(competitors);
    } catch (error) {
        console.error(`Error finding top competitors:`, error);
        res.status(500).send(error.toString());
    }
});


app.post('/check-rank', async (req, res) => {
    const { platform, appId, keywords, country, languageCode } = req.body;
    let rankings = [];
    const keywordArray = keywords.split(',');

    const currentDate = new Date().toISOString().split('T')[0];

    for (const keyword of keywordArray) {
        const trimmedKeyword = keyword.trim();
        try {
            const rank = await checkRank(platform, appId, trimmedKeyword, country, languageCode);
            rankings.push({
                keyword: trimmedKeyword,
                rank: rank,
                date: currentDate
            });
        } catch (error) {
            console.error(`Error fetching rank for keyword '${trimmedKeyword}':`, error);
            rankings.push({
                keyword: trimmedKeyword,
                rank: 'Error',
                date: currentDate
            });
        }
    }
    res.json({ rankings });
});




app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
