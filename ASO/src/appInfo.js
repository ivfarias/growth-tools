import gplay from 'google-play-scraper';
import store from 'app-store-scraper';
import path from 'path';
import fs from 'fs';

// Utility function for delaying execution
const delay = ms => new Promise(res => setTimeout(res, ms));

// Function to fetch app details, reviews, and rankings
export async function fetchAppDetails(platform, appId, country, languageCode) {
    try {
        let appDetails, reviews, ranking;
        if (platform === 'Android') {
            appDetails = await gplay.app({ appId, country, lang: languageCode }).catch(() => null);
        } else {
            appDetails = await store.app({ id: appId, country, lang: languageCode }).catch(() => null);
        }

        if (!appDetails) {
            console.warn(`App with ID ${appId} not found for ${platform} in country ${country}`);
            return null;
        }


        return { ...appDetails };
    } catch (error) {
        console.error(`Error fetching details for ${platform} app with ID ${appId}:`, error);
        return null;
    }
}

// Function to find top competitors
async function fetchTopAppsByKeyword(platform, keyword, country, languageCode) {
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

// Main function to find top competitors
export async function findTopCompetitors(platform, keywords, userAppId, country, languageCode) {
    const allApps = new Map();
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Fetch top apps for each keyword with a delay between requests
    for (const keyword of keywords.split(',')) {
        const topApps = await fetchTopAppsByKeyword(platform, keyword.trim(), country, languageCode);
        topApps.forEach((appId, index) => {
            if (appId !== userAppId) { // Exclude user's own app
                if (!allApps.has(appId)) {
                    allApps.set(appId, { count: 0, ranks: {} });
                }
                allApps.get(appId).count++;
                allApps.get(appId).ranks[keyword] = { position: index + 1, date: currentDate };
            }
        });
        await delay(1000);
    }

    // Sort and select top 10 competitors
    const sortedCompetitors = Array.from(allApps)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .reduce((obj, [appId, data]) => {
            obj[appId] = { ranksFor: data.ranks };
            return obj;
        }, {});

    return { competitors: sortedCompetitors };
}


export async function fetchReviews(platform, appId, country, languageCode) {
    let reviews = [];
    let options;

    if (platform === 'Android') {
        options = {
            appId: appId,  // For Android, use appId
            country: country,
            sort: gplay.sort.RATING,
            num: 10,
            paginate: true,
            lang: languageCode
        };
        reviews = await gplay.reviews(options).then(response => response.data || []);
    } else {
        options = {
            id: appId,  // For iOS, use id since you have the numerical ID
            country: country,
            sort: store.sort.RATING,
            num: 10,
            paginate: true,
            lang: languageCode
        };
        reviews = await store.reviews(options).then(response => response.data || []);
    }

    return reviews;
}

export async function checkRank(platform, appId, keyword, country, languageCode) {
    const options = {
        term: keyword,
        country: country,
        num: 30,
        lang: languageCode
    };

    try {
        await delay(1000);
        const results = await (platform === 'Android' ? gplay.search(options) : store.search(options));
        const rankedApp = results.find(app => app.appId === appId || app.id === appId);
        return rankedApp ? results.indexOf(rankedApp) + 1 : '30+';
    } catch (error) {
        console.error(`Error fetching rank for keyword '${keyword}':`, error);
        return 'Error';
    }
}


