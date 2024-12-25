import { readFile, writeFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { initBrowser, createPage } from './src/utils/browserSetup.js';
import { evaluateTitle, evaluateLocation } from './src/utils/pageEvaluators.js';

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

        await page.waitForTimeout(5000);
        console.log('Attente de 5 secondes terminée...');

        const pageTitle = await page.title();
        console.log('Titre de la page:', pageTitle);

        if (pageTitle.includes('Indeed.com Captcha') || pageTitle.includes('Request Blocked')) {
            console.log('⚠️ Captcha détecté ! Vous avez 2 minutes pour le résoudre...');
            shouldCloseBrowser = false;
            await page.waitForTimeout(120000);
            
            const newTitle = await page.title();
            if (newTitle.includes('Indeed.com Captcha') || newTitle.includes('Request Blocked')) {
                console.log('❌ Le captcha est toujours présent.');
                return { title: 'Captcha non résolu', location: 'Captcha non résolu' };
            }
        }

        console.log('🔍 Recherche du titre du poste...');
        const title = await evaluateTitle(page);
        console.log('✅ Titre trouvé:', title);

        console.log('🔍 Recherche de la localisation...');
        const location = await evaluateLocation(page);
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