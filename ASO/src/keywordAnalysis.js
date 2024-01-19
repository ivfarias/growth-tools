import dotenv from 'dotenv';
import gplay from 'google-play-scraper';
import store from 'app-store-scraper';
import fetch from 'node-fetch';
import { saveToJsonFile } from './utils.js'; // Adjust the path as necessary


dotenv.config();

async function getAccessToken() {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: process.env.GOOGLE_ADS_CLIENT_ID,
            client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
            refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
            grant_type: 'refresh_token'
        })
    });

    const data = await response.json();
    return data.access_token;
}

export async function fetchGoogleAdsKeywordIdeas(userKeywords, languageCode, country) {
    const accessToken = await getAccessToken();

    const promises = userKeywords.map(async (keyword) => {
        const requestBody = {
            queryText: keyword,
            countryCode: country,
            languageCode: languageCode
        };

        console.log('Request Body:', requestBody);

        try {
            const response = await fetch('https://googleads.googleapis.com/v15/keywordThemeConstants:suggest', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                    'login-customer-id': process.env.LOGIN_CUSTOMER_ID,
                    'linked-customer-id': process.env.LINKED_CUSTOMER_ID
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            console.log(`Response for keyword '${keyword}':`, data);

            // Slice to keep only the top 5 keyword ideas per input keyword
            return data.keywordThemeConstants ? data.keywordThemeConstants.slice(0, 5) : [];
        } catch (error) {
            console.error(`Error fetching data for keyword '${keyword}':`, error);
            return [];
        }
    });

    const keywordThemeConstants = await Promise.all(promises);
    return keywordThemeConstants.flat();
}


// Function to fetch top apps by keyword
export async function fetchTopAppsByKeyword(platform, keyword, country, languageCode) {
    const searchOptions = {
        term: keyword,
        country,
        num: 10,
        fullDetail: false,
        lang: languageCode
    };

    const searchFunc = platform === 'Android' ? gplay.search : store.search;
    const apps = await searchFunc(searchOptions);
    return apps.map(app => platform === 'Android' ? app.appId : app.id);
}


// Main function to process keywords
export async function processKeywords(selectedKeywords, languageCode, country, platform, resultsDir) {
    let keywordsAppsMapping = {};
    for (const keyword of selectedKeywords) {
        const appIds = await fetchTopAppsByKeyword(platform, keyword, country);
        keywordsAppsMapping[keyword] = appIds;
    }

    // Save to JSON
    saveToJsonFile(keywordsAppsMapping, 'initial_competitors.json', resultsDir, languageCode);

    return keywordsAppsMapping;
}
