import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { evaluateTitle, evaluateLocation } from './src/utils/pageEvaluators.js';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

puppeteer.use(StealthPlugin());

async function scrapeJobInfo(page, url) {
  try {
    // Vérifier si l'URL est valide
    if (!url.startsWith('http')) {
      console.error('❌ URL invalide:', url);
      return {
        title: 'URL invalide',
        location: 'URL invalide',
        url
      };
    }

    // Attendre plus longtemps pour le chargement initial
    await page.goto(url, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000 
    });
    
    // Ajouter un délai aléatoire plus long
    const delay = Math.floor(Math.random() * 3000) + 3000; // 3-6 secondes
    await new Promise(resolve => setTimeout(resolve, delay));

    // Vérifier si la page contient un captcha
    const hasCaptcha = await page.evaluate(() => {
      return document.body.textContent.includes('captcha') || 
             document.body.textContent.includes('Captcha');
    });

    if (hasCaptcha) {
      console.log('⚠️ Captcha détecté, attente supplémentaire...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Attendre 10 secondes supplémentaires
    }

    console.log('🔍 Recherche du titre...');
    const title = await evaluateTitle(page);
    console.log('✅ Titre trouvé:', title);

    console.log('🔍 Recherche de la localisation...');
    const location = await evaluateLocation(page);
    console.log('✅ Localisation trouvée:', location);

    // Sauvegarder un screenshot pour le debug si nécessaire
    await page.screenshot({ path: 'debug-screenshot.png' });

    return {
      title,
      location,
      url
    };
  } catch (error) {
    console.error('Erreur lors du scraping:', error);
    // Attendre un peu plus longtemps avant de continuer
    await new Promise(resolve => setTimeout(resolve, 5000));
    return {
      title: 'Erreur lors de la récupération',
      location: 'Erreur lors de la récupération',
      url
    };
  }
}

async function readUrlsFromCsv() {
  return new Promise((resolve, reject) => {
    const urls = [];
    createReadStream('urls.csv')
      .pipe(parse({ delimiter: ',', from_line: 1 }))
      .on('data', function(row) {
        // Ne garder que les URLs valides
        if (row[0] && row[0].startsWith('http')) {
          urls.push(row[0]);
        } else {
          console.warn('⚠️ URL invalide ignorée:', row[0]);
        }
      })
      .on('end', function() {
        resolve(urls);
      })
      .on('error', function(error) {
        reject(error);
      });
  });
}

async function processUrls() {
  try {
    console.log('📖 Lecture du fichier urls.csv...');
    const urls = await readUrlsFromCsv();
    console.log(`✅ ${urls.length} URLs trouvées dans le fichier CSV`);

    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const results = [];
    const page = await browser.newPage();
    
    // Configuration du navigateur
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Désactiver les timeouts par défaut
    page.setDefaultNavigationTimeout(0);
    page.setDefaultTimeout(0);

    for (const url of urls) {
      console.log(`🌐 Traitement de l'URL: ${url}`);
      const jobInfo = await scrapeJobInfo(page, url);
      results.push(jobInfo);
      
      // Attendre entre chaque URL
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 5000)); // 5-10 secondes
    }

    await browser.close();
    console.log('🔒 Navigateur fermé');

    await fs.writeFile('results.json', JSON.stringify(results, null, 2));
    console.log('💾 Résultats sauvegardés dans results.json');

    return results;
  } catch (error) {
    console.error('❌ Erreur lors du traitement:', error);
    throw error;
  }
}

// Lancer le processus
processUrls().catch(console.error);