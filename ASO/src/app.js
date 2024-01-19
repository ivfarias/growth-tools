import 'dotenv/config';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import figlet from 'figlet';
import fs from 'fs';
import path from 'path';
import { fetchAppDetails, findTopCompetitors } from './modules/appInfo.js';
import { fetchGoogleAdsKeywordIdeas, processKeywords } from './modules/keywordAnalysis.js';
import { saveToJsonFile } from './modules/utils.js';

// Display Header
const sectionSeparator = chalk.cyanBright(figlet.textSync('APP STORE OPTIMIZATION', { font: 'Small' }));
console.log(sectionSeparator);
console.log(chalk.yellow("Hello 👋 \nWelcome to the Growth ASO Module"));

// Main ASO Function
async function appStoreOptimization() {
    const resultsDir = prepareResultsDirectory();
    const userInputs = await getUserInputs();
    const { platform, appId, keywords, country, languageCode } = userInputs;

    const spinner = ora('Starting App Store Optimization...').start();


    try {
        spinner.start('Fetching app details...');
        const appDetails = await fetchAppDetails(platform, appId, country, languageCode, keywords[0]);
        saveToJsonFile(appDetails, `${appId}_details.json`, resultsDir, languageCode);
        spinner.succeed('App details fetched and saved.');

        const { fetchAdditionalKeywords } = userInputs;
        spinner.start('Processing selected keywords...');
        const selectedKeywords = await fetchAndSelectKeywords(keywords, languageCode, country, fetchAdditionalKeywords);
        const keywordsAppsMapping = await processKeywords(selectedKeywords, languageCode, country, platform, resultsDir);
        spinner.succeed('Keywords processed.');

        spinner.start('Finding top competitors...');
        const representativeKeyword = selectedKeywords[0];
        const topCompetitors = await findTopCompetitors(resultsDir, representativeKeyword, country, platform);
        topCompetitors.forEach(competitor => {
            saveToJsonFile(competitor, `competitor_${competitor.appId}_details.json`, resultsDir, languageCode);
        });
        spinner.succeed('Top competitors found and saved.');

        saveAndDisplayResults(appId, topCompetitors, selectedKeywords, resultsDir, languageCode);
    } catch (error) {
        spinner.fail('An error occurred during the optimization process.');
        console.error(chalk.red("Error details:"), error);
    }
}


// Function to handle user inputs
async function getUserInputs() {
    // Define questions for user input
    const questions = [
        {
            type: 'list',
            name: 'platform',
            message: 'Choose the platform:',
            choices: ['Android', 'iOS']
        },
        {
            type: 'input',
            name: 'appId',
            message: 'Enter the app package name/id:'
        },
        {
            type: 'input',
            name: 'keywords',
            message: 'List at least 3 keywords that best describe your app (comma separated):',
            validate: (input) => {
                if (!input) {
                    return 'Please enter at least one keyword.';
                }
                return true;
            }
        },
        {
            type: 'confirm',
            name: 'fetchAdditionalKeywords',
            message: 'Do you want to fetch additional keywords from Google Ads?',
            default: false
        },
        {
            type: 'input',
            name: 'country',
            message: 'Enter the country code:',
            default: 'us'
        },
        {
            type: 'input',
            name: 'languageCode',
            message: 'Enter language code:',
            default: ''
        },
        {
            type: 'confirm',
            name: 'fetchCompetitors',
            message: 'Do you want me to look for competitors?',
            default: true
        },
        {
            type: 'input',
            name: 'competitorAppIds',
            message: 'List the app IDs of your competitors separated by comma:',
            when: (answers) => !answers.fetchCompetitors,
            default: ''
        }
    ];
    return inquirer.prompt(questions).then(answers => {
        // Transform country code to uppercase
        answers.country = answers.country.toUpperCase();

        if (typeof answers.keywords === 'string') {
            answers.keywords = answers.keywords.split(',').map(kw => kw.trim());
        }
        return answers;
    });
}

// Function to prepare the results directory
function prepareResultsDirectory() {
    const resultsDir = path.join(new URL(import.meta.url).pathname, '..', 'results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    return resultsDir;
}

// Function to fetch and select keywords
// Function to fetch and select keywords with enhanced loading animation using ora
async function fetchAndSelectKeywords(keywords, languageCode, country, fetchAdditionalKeywords) {
    let selectedKeywords = [...keywords]; // Keep the original keywords

    if (fetchAdditionalKeywords) {
        const spinner = ora({ text: 'Initializing keyword fetch from Google Ads...', spinner: 'dots' }).start();

        try {
            spinner.text = 'Fetching keywords from Google Ads...';
            const keywordThemeConstants = await fetchGoogleAdsKeywordIdeas(keywords, languageCode, country);
            const fetchedKeywordSuggestions = keywordThemeConstants.flat().map(kw => kw.displayName);
            const uniqueKeywordSuggestions = [...new Set(fetchedKeywordSuggestions)];

            spinner.succeed('Keywords successfully fetched from Google Ads.');

            const keywordSelection = await inquirer.prompt([{
                type: 'checkbox',
                name: 'selectedGoogleAdsKeywords',
                message: 'Select additional keywords from Google Ads:',
                choices: uniqueKeywordSuggestions
            }]);

            selectedKeywords = selectedKeywords.concat(keywordSelection.selectedGoogleAdsKeywords);
            spinner.succeed('Selected additional keywords have been added.');
        } catch (error) {
            spinner.fail('An error occurred while fetching keywords.');
            console.error(chalk.red("Error details:"), error);
        }
    }

    return selectedKeywords;
}


function saveAndDisplayResults(appId, topCompetitors, selectedKeywords, resultsDir, languageCode) {
    const spinner = ora({ text: 'Saving results...', spinner: 'dots' }).start();

    try {
        const allData = {
            keywordIdeas: selectedKeywords,
            topCompetitors: topCompetitors,
        };

        saveToJsonFile(allData, `${appId}_keywords_rank_density.json`, resultsDir, languageCode);
        spinner.succeed('Results saved successfully.');
        console.log(chalk.magenta("Process completed successfully"));
    } catch (error) {
        spinner.fail('Failed to save results.');
        console.error(chalk.red("Error during saving results:"), error);
    }
}




// Running the main function
appStoreOptimization()
    .catch(error => console.error(chalk.red("An error occurred in the main function:"), error));
