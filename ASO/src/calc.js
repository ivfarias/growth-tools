import { fetchAppDetails } from './modules/appInfo.js';

// Function to calculate the Difficulty Score for a keyword
export function calculateDifficultyScore(appDetails) {
    // Updated weights
    const weights = {
        titleMatch: 0.2,
        competitors: 0.25,
        installs: 0.2,
        rating: 0.15,
        age: 0.2
    };

    // Extract data from appDetails
    const { titleMatchScore, competitors, averageInstalls, averageRating, averageAge } = extractDifficultyData(appDetails);

    // Linear scoring function for each component
    const scores = {
        titleMatch: linearScore(titleMatchScore, 0, 10, true), // Adjusted max score to 10
        competitors: linearScore(competitors, 0, 100),
        installs: linearScore(averageInstalls, 1000, 1000000),
        rating: linearScore(averageRating, 1, 5, true),
        age: linearScore(averageAge, 0, 365)
    };

    // Calculate weighted sum
    let difficultyScore = 0;
    for (const [key, value] of Object.entries(scores)) {
        difficultyScore += value * weights[key];
    }

    return difficultyScore.toFixed(2);
}

export function calculateTrafficScore(trafficData) {
    // Adjusted weights
    const weights = {
        suggest: 0.3,
        ranked: 0.35,
        installs: 0.2,
        length: 0.15
    };

    // Extract data
    const { suggestScore, rankedScore, averageInstalls, keywordLength } = trafficData;

    // Updated scoring functions for each component
    const scores = {
        suggest: linearScore(suggestScore, 0, 10, true),
        ranked: rankedAppsScore(rankedScore), // New scoring method for ranked apps
        installs: linearScore(averageInstalls, 1000, 1000000),
        length: inverseLinearScore(keywordLength, 1, MAX_KEYWORD_LENGTH) // Inverse score for length
    };

    // Calculate weighted sum
    let trafficScore = 0;
    for (const [key, value] of Object.entries(scores)) {
        trafficScore += value * weights[key];
    }

    return trafficScore.toFixed(2);
}

// Helper function to perform linear scoring
function linearScore(value, min, max, inverse = false) {
    let score = (value - min) / (max - min);
    score = score < 0 ? 0 : score > 1 ? 1 : score; // Ensure score is between 0 and 1
    return inverse ? 1 - score : score;
}

function inverseLinearScore(value, min, max) {
    let score = (max - value) / (max - min);
    return Math.max(0, Math.min(score, 1)); // Ensure score is between 0 and 1
}

function calculateAverageInstalls(minInstalls, maxInstalls) {
    return (minInstalls + maxInstalls) / 2;
}
function calculateAppAge(updatedTimestamp) {
    const updatedDate = new Date(updatedTimestamp);
    const currentDate = new Date();
    const timeDifference = currentDate - updatedDate;
    return Math.floor(timeDifference / (1000 * 60 * 60 * 24));
}
function extractDifficultyData(appDetails) {
    // Assuming appDetails includes necessary properties
    const titleMatchScore = calculateTitleMatchScore(appDetails.titles, appDetails.keyword); // Adjusted to use properties
    const competitors = appDetails.competitorsCount; // Adjust as necessary
    const averageInstalls = appDetails.averageInstalls; // Adjust as necessary
    const averageRating = appDetails.averageRating; // Adjust as necessary
    const averageAge = appDetails.averageAge; // Adjust as necessary

    return { titleMatchScore, competitors, averageInstalls, averageRating, averageAge };
}

// Implement the calculateTitleMatchScore function based on your criteria
function calculateTitleMatchScore(appTitles, keyword) {
    // Split the keyword into words
    const keywordWords = keyword.toLowerCase().split(/\s+/);

    // Scoring for different types of matches
    const scores = {
        exact: 1,
        broad: 0.75,
        partial: 0.5,
        none: 0
    };

    let totalScore = 0;

    appTitles.forEach(title => {
        const titleWords = title.toLowerCase().split(/\s+/);
        if (isExactMatch(titleWords, keywordWords)) {
            totalScore += scores.exact;
        } else if (isBroadMatch(titleWords, keywordWords)) {
            totalScore += scores.broad;
        } else if (isPartialMatch(titleWords, keywordWords)) {
            totalScore += scores.partial;
        } else {
            totalScore += scores.none;
        }
    });

    // Calculate average score
    return totalScore / appTitles.length;
}

function isExactMatch(titleWords, keywordWords) {
    return keywordWords.join(' ') === titleWords.join(' ');
}

function isBroadMatch(titleWords, keywordWords) {
    return keywordWords.every(word => titleWords.includes(word));
}

function isPartialMatch(titleWords, keywordWords) {
    return keywordWords.some(word => titleWords.includes(word));
}