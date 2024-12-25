import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { readFile, writeFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';

puppeteer.use(StealthPlugin());

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
];

async function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function initBrowser() {
    console.log('Initialisation du navigateur...');
    return await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            '--start-maximized',
            '--disable-notifications',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });
}

async function createPage(browser) {
    const page = await browser.newPage();
    const userAgent = await getRandomUserAgent();
    
    await page.setUserAgent(userAgent);
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
    });

    // Intercepter les requêtes pour éviter certaines détections
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
            request.continue();
        } else {
            request.continue();
        }
    });

    return page;
}

async function scrapeJobInfo(url) {
    console.log(`Scraping de l'URL: ${url}`);
    const browser = await initBrowser();
    const page = await createPage(browser);
    let shouldCloseBrowser = true;

    try {
        await page.goto(url, { 
            waitUntil: 'networkidle0', 
            timeout: 60000 
        });
        console.log('Page chargée avec succès...');

        // Utiliser page.evaluate pour attendre
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
        console.log('Attente de 5 secondes terminée...');

        const pageTitle = await page.title();
        console.log('Titre de la page:', pageTitle);

        if (pageTitle.includes('Indeed.com Captcha') || pageTitle.includes('Request Blocked')) {
            console.log('⚠️ Captcha détecté ! Vous avez 2 minutes pour le résoudre...');
            shouldCloseBrowser = false;
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 120000))); // 2 minutes
            
            const newTitle = await page.title();
            console.log('Nouveau titre après attente:', newTitle);
            if (newTitle.includes('Indeed.com Captcha') || newTitle.includes('Request Blocked')) {
                console.log('❌ Le captcha est toujours présent. La page restera ouverte pour résolution manuelle.');
                return { title: 'Captcha non résolu', location: 'Captcha non résolu' };
            }
        }

        console.log('🔍 Recherche du titre du poste...');
        const title = await page.evaluate(() => {
            const selectors = [
                'h1.jobsearch-JobInfoHeader-title',
                '.jobsearch-JobInfoHeader-title',
                '[data-testid="jobsearch-JobInfoHeader-title"]',
                'h1[class*="JobInfoHeader"]',
                'h1[class*="jobtitle"]'
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    console.log('Sélecteur utilisé pour le titre:', selector);
                    return element.textContent.trim();
                }
            }
            
            // Si aucun sélecteur ne fonctionne, chercher tous les h1
            const h1Elements = document.querySelectorAll('h1');
            for (const h1 of h1Elements) {
                if (h1.textContent.length > 0) {
                    return h1.textContent.trim();
                }
            }
            
            return 'Titre non trouvé';
        });
        console.log('✅ Titre trouvé:', title);

        console.log('🔍 Recherche de la localisation...');
        const location = await page.evaluate(() => {
            const selectors = [
                'div[data-testid="job-location"]',
                '.jobsearch-JobInfoHeader-subtitle div.icl-u-xs-mt--xs',
                '.jobsearch-CompanyInfoContainer div[data-testid="inlineHeader-companyLocation"]',
                '.jobsearch-JobInfoHeader-subtitle .icl-u-textColor--secondary',
                '.jobsearch-InlineCompanyRating div:nth-child(2)',
                '[class*="JobLocation"]',
                '[class*="location"]',
                '[data-testid*="location"]'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    console.log('Sélecteur utilisé pour la localisation:', selector);
                    const fullText = element.textContent.trim();
                    // Utiliser une regex pour extraire uniquement la ville et le canton
                    const locationMatch = fullText.match(/([^,]+),\s*([A-Z]{2})/);
                    if (locationMatch) {
                        return `${locationMatch[1].trim()}, ${locationMatch[2]}`;
                    }
                    return fullText; // Retourner le texte complet si le pattern n'est pas trouvé
                }
            }
            return 'Localisation non trouvée';
        });
        console.log('✅ Localisation trouvée:', location);

        await page.screenshot({ path: 'debug-screenshot.png' });
        console.log('📸 Screenshot sauvegardé dans debug-screenshot.png');

        return { title, location };
    } catch (error) {
        console.error('❌ Erreur lors du scraping:', error);
        return { title: 'Erreur', location: 'Erreur' };
    } finally {
        if (shouldCloseBrowser) {
            await browser.close();
            console.log('🔒 Navigateur fermé');
        } else {
            console.log('⚠️ Le navigateur reste ouvert pour résolution manuelle du captcha');
        }
    }
}

async function processUrls() {
    console.log('🚀 Démarrage du programme...');
    console.log('📖 Lecture du fichier CSV...');
    
    try {
        const fileContent = await readFile('urls.csv', 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });

        const results = [];
        
        for (const row of records) {
            const url = row.url;
            console.log(`\n🔄 Traitement de l'URL: ${url}`);
            const jobInfo = await scrapeJobInfo(url);
            results.push({ url, ...jobInfo });
            
            await writeFile('results.json', JSON.stringify(results, null, 2));
            console.log('💾 Résultats sauvegardés dans results.json');
        }

        console.log('\n✅ Traitement terminé !');
        console.log('📁 Tous les résultats ont été sauvegardés dans results.json');
    } catch (error) {
        console.error('❌ Erreur lors du traitement:', error);
    }
}

processUrls();
