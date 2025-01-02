import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

puppeteer.use(StealthPlugin());

// Function to format logs with timestamp in yellow
const logWithTimestamp = (message) => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  console.log(`\x1b[33m[${hours}:${minutes}:${seconds}]\x1b[0m ${message}`);
};

const logErrorWithTimestamp = (message, error) => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  console.error(`\x1b[33m[${hours}:${minutes}:${seconds}]\x1b[0m ${message}`, error);
};

const DELAY_MIN = 500;  // Réduit de 2000 à 500
const DELAY_MAX = 1000; // Réduit de 5000 à 1000
const MAX_RETRIES = 3;
const CAPTCHA_TIMEOUT = 30000;
const SCREENSHOTS_DIR = './screenshots';

const randomDelay = (min = DELAY_MIN, max = DELAY_MAX) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

// Utility function for delays
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function initBrowser() {
  const stealthPlugin = StealthPlugin();
  puppeteer.use(stealthPlugin);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--window-size=1920,1080'
    ],
    defaultViewport: null
  });

  return browser;
}

let screenshotCount = 0;

async function takeErrorScreenshot(page, url) {
  try {
    // Only take one screenshot per URL
    const urlHash = Buffer.from(url).toString('base64').substring(0, 30);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(process.cwd(), 'screenshots', `error_${timestamp}_${urlHash}.png`);
    
    // Check if we already took a screenshot for this URL
    if (screenshotCount > 0) {
      logWithTimestamp('Screenshot already taken for this URL, skipping...');
      return;
    }

    // Create the screenshots directory if it doesn't exist
    if (!existsSync(path.join(process.cwd(), 'screenshots'))) {
      await mkdir(path.join(process.cwd(), 'screenshots'), { recursive: true });
    }

    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshotCount++;
    logWithTimestamp(`Screenshot saved: ${screenshotPath}`);
  } catch (error) {
    logErrorWithTimestamp('Error taking screenshot:', error);
  }
}

async function handleCaptcha(page) {
  try {
    const captchaFrame = await page.$('iframe[title*="reCAPTCHA"]');
    if (captchaFrame) {
      logWithTimestamp('Captcha detected, solving...');
      
      // Wait for a longer random delay before starting
      await delay(randomDelay(3000, 5000));
      
      const frame = page.frames().find(frame => frame.url().includes('recaptcha'));
      if (frame) {
        const checkbox = await frame.$('.recaptcha-checkbox-border');
        if (checkbox) {
          // Simulate a more natural mouse movement
          await page.mouse.move(0, 0);
          const box = await checkbox.boundingBox();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
          
          // Wait for a random delay before clicking
          await delay(randomDelay(1000, 2000));
          
          await checkbox.click({ delay: randomDelay(50, 150) });
          
          // Wait longer for validation
          await delay(randomDelay(2000, 3000));
          
          return true;
        }
      }
    }
    return true;
  } catch (error) {
    logErrorWithTimestamp('Error handling captcha:', error);
    return false;
  }
}

async function handleCookies(page) {
  try {
    // Multiple attempts to handle cookies
    for (let i = 0; i < 3; i++) {
      // Wait for the cookie popup to appear
      await delay(2000);

      // Find the cookie acceptance button
      const cookieAccepted = await page.evaluate(() => {
        const selectors = [
          'button[id*="cookie-accept"]',
          'button[id*="accept-all"]',
          'button[id*="accept-cookies"]',
          'button:not([disabled]):not([aria-hidden="true"]):not([style*="display: none"])'
        ];

        for (const selector of selectors) {
          const buttons = document.querySelectorAll(selector);
          for (const button of buttons) {
            const text = button.textContent.toLowerCase();
            if (text.includes('accept all cookies') || text.includes('accept cookies')) {
              button.click();
              return true;
            }
          }
        }
        return false;
      });

      if (cookieAccepted) {
        logWithTimestamp('Cookies accepted');
        // Wait for the popup to disappear
        await delay(2000);
        return true;
      }

      // If cookies were not accepted, wait and retry
      await delay(2000);
    }

    return false;
  } catch (error) {
    logErrorWithTimestamp('Error handling cookies:', error);
    return false;
  }
}

async function loadPageWithRetry(page, url, maxRetries = 3) {
    await page.setRequestInterception(true);
    
    const requestHandler = request => {
        if (request.isInterceptResolutionHandled()) return;
        
        const headers = {
            ...request.headers(),
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        
        request.continue({ headers });
    };

    page.on('request', requestHandler);

    for (let i = 0; i < maxRetries; i++) {
        try {
            logWithTimestamp(`Loading page (attempt ${i + 1})`);
            
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Simulate human behavior
            await page.mouse.move(Math.random() * 100, Math.random() * 100);
            await delay(Math.random() * 1000 + 500);

            // Handle cookies if present
            try {
                const cookieButton = await page.$('button[id*="cookie"]');
                if (cookieButton) {
                    await cookieButton.click();
                    logWithTimestamp('Cookies accepted');
                    await delay(1000);
                }
            } catch (cookieError) {
                // Ignore cookie errors
            }

            // Check if the page is loaded
            const pageLoaded = await page.evaluate(() => {
                // Check the title
                const titleSelectors = [
                    'h1.jobsearch-JobInfoHeader-title',
                    'h2[class*="jobsearch"]',
                    'h2[class*="css-"]',
                    'div[class*="jobsearch"] h2'
                ];
                const hasTitle = titleSelectors.some(selector => {
                    const element = document.querySelector(selector);
                    return element && element.textContent.trim().length > 0;
                });

                // Check the description
                const descriptionSelectors = [
                    '#jobsearch-JobComponent-description',
                    '#job-description',
                    '[data-testid="jobsearch-JobComponent-description"]',
                    '.jobsearch-jobDescriptionText',
                    'div[class*="jobsearch"][class*="description"]',
                    'div[id*="jobDescriptionText"]'
                ];
                const hasDescription = descriptionSelectors.some(selector => {
                    const element = document.querySelector(selector);
                    return element && element.textContent.trim().length > 100;
                });

                // Check if it's a specific error page
                const errorTexts = [
                    "this job has expired",
                    "page not found",
                    "404",
                    "this job is no longer available"
                ];
                
                const bodyText = document.body.textContent.toLowerCase();
                const isErrorPage = errorTexts.some(text => 
                    bodyText.includes(text) && !hasTitle && !hasDescription
                );

                return {
                    isLoaded: hasTitle || hasDescription,
                    isError: isErrorPage,
                    debug: {
                        title: document.title,
                        url: window.location.href,
                        hasTitle,
                        hasDescription,
                        bodyLength: document.body.textContent.length
                    }
                };
            });

            // Log for debug
            logWithTimestamp(`Page status: ${JSON.stringify(pageLoaded.debug)}`);

            if (pageLoaded.isError) {
                logWithTimestamp('Page is an error page, skipping...');
                return false;
            }

            if (!pageLoaded.isLoaded) {
                logWithTimestamp('Page content not found');
                throw new Error('Page content not found');
            }

            return true;
        } catch (error) {
            if (i === maxRetries - 1) {
                logWithTimestamp(`Failed to load page after ${maxRetries} attempts`);
                return false;
            }
            await delay(2000 * (i + 1));
        }
    }
    return false;
}

async function evaluateTitle(page) {
    try {
        const title = await page.evaluate(() => {
            const h1Title = document.querySelector('h1.jobsearch-JobInfoHeader-title');
            if (h1Title) return h1Title.textContent.trim();

            const h2s = Array.from(document.getElementsByTagName('h2'));
            const titleH2 = h2s.find(h2 => 
                h2.textContent.trim().length > 0 && 
                !h2.textContent.toLowerCase().includes('suggestions') &&
                !h2.textContent.toLowerCase().includes('similar jobs')
            );
            return titleH2 ? titleH2.textContent.trim() : 'Title not found';
        });
        return title || 'Title not found';
    } catch (error) {
        return 'Title not found';
    }
}

async function evaluateCompany(page) {
    try {
        const company = await page.evaluate(() => {
            // Strategy 1: Look for specific attributes
            const companySelectors = [
                '[data-company-name="true"]',
                '[data-testid*="company-name"]',
                '[data-testid*="employer-name"]'
            ];

            for (const selector of companySelectors) {
                const element = document.querySelector(selector);
                if (element) return element.textContent.trim();
            }

            // Strategy 2: Look in links containing the company name
            const links = Array.from(document.getElementsByTagName('a'));
            const companyLink = links.find(link => {
                const href = link.getAttribute('href') || '';
                return (href.includes('/cmp/') || href.includes('/company/')) && 
                       link.textContent.trim().length > 0;
            });
            if (companyLink) return companyLink.textContent.trim();

            // Strategy 3: Look in elements with specific classes
            const elements = document.querySelectorAll('div[class*="company"], span[class*="company"]');
            for (const element of elements) {
                const text = element.textContent.trim();
                if (text && text.length > 0 && text.length < 50) {
                    return text;
                }
            }

            return 'Company not found';
        });
        return company || 'Company not found';
    } catch (error) {
        return 'Company not found';
    }
}

async function evaluateLocationAndRemote(page) {
    try {
        const locationInfo = await page.evaluate(() => {
            // Fonction pour nettoyer le texte
            const cleanText = (text) => {
                return text.trim()
                    .replace(/&nbsp;/g, ' ')
                    .replace(/\s+/g, ' ');
            };

            // Liste des sélecteurs possibles pour la location
            const locationSelectors = [
                '[data-testid="inlineHeader-companyLocation"]',
                '[data-testid="jobsearch-JobInfoHeader-companyLocation"]',
                '.jobsearch-JobInfoHeader-companyLocation',
                '[class*="jobsearch-JobInfoHeader-companyLocation"]',
                '[data-testid*="companyLocation"]',
                '.companyLocation'
            ];

            let location = '';
            let foundSelector = '';

            // Essayer chaque sélecteur jusqu'à trouver la location
            for (const selector of locationSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    location = cleanText(element.textContent);
                    foundSelector = selector;
                    break;
                }
            }

            // Si aucune location trouvée, chercher dans la description
            if (!location) {
                const descriptionElement = document.querySelector('#jobDescriptionText');
                if (descriptionElement) {
                    const text = descriptionElement.textContent;
                    // Chercher des motifs communs de location dans la description
                    const locationPatterns = [
                        /Location:\s*([^\.]+)/i,
                        /Standort:\s*([^\.]+)/i,
                        /Based in:\s*([^\.]+)/i,
                        /Office in:\s*([^\.]+)/i
                    ];

                    for (const pattern of locationPatterns) {
                        const match = text.match(pattern);
                        if (match) {
                            location = cleanText(match[1]);
                            foundSelector = 'description-pattern';
                            break;
                        }
                    }
                }
            }

            // Loguer les informations de debug
            console.log('Location detection:', {
                location,
                foundSelector,
                allElements: locationSelectors.map(s => ({
                    selector: s,
                    exists: !!document.querySelector(s)
                }))
            });

            return { 
                location,
                foundSelector,
                timestamp: new Date().toISOString()
            };
        });

        // Loguer les informations côté serveur
        console.log('Location evaluation result:', {
            location: locationInfo.location,
            foundSelector: locationInfo.foundSelector,
            timestamp: locationInfo.timestamp
        });

        return locationInfo;
    } catch (error) {
        console.error('Error evaluating location:', error);
        return { 
            location: 'Location not found',
            error: error.message
        };
    }
}

async function evaluateSalary(page) {
    try {
        const salary = await page.evaluate(() => {
            // Function to extract clean salary from text
            const extractSalary = (text) => {
                // Patterns to match salary formats
                const salaryPattern = /((?:CHF|EUR|€)\s*[\d.,]+(?:\s*-\s*(?:CHF|EUR|€)\s*[\d.,]+)?(?:\s*(?:k|K))?\s*(?:par |per |a |\/)?(?:year|month|hour|an|mois|heure))/i;
                
                const match = text.match(salaryPattern);
                if (match) {
                    return match[1].trim();
                }
                return null;
            };

            // Function to check if text contains salary pattern
            const isSalaryText = (text) => {
                const patterns = [
                    /(?:CHF|EUR|€)\s*[\d.,]+(?:\s*-\s*(?:CHF|EUR|€)\s*[\d.,]+)?(?:\s*(?:k|K))?\s*(?:par |per |a |\/)?(?:year|month|hour|an|mois|heure)/i,
                    /[\d.,]+(?:\s*-\s*[\d.,]+)?\s*(?:CHF|EUR|€)(?:\s*(?:k|K))?\s*(?:par |per |a |\/)?(?:year|month|hour|an|mois|heure)/i
                ];
                return patterns.some(pattern => pattern.test(text));
            };

            // Strategy 1: Look for salary in small text elements
            const allElements = document.getElementsByTagName('*');
            for (const element of allElements) {
                // Skip elements with too many children (likely containers)
                if (element.children.length > 3) continue;

                const text = element.textContent.trim();
                // Skip empty or too long texts
                if (!text || text.length > 100) continue;

                if (isSalaryText(text)) {
                    const cleanSalary = extractSalary(text);
                    if (cleanSalary) {
                        console.log('Found salary by pattern match:', cleanSalary);
                        return cleanSalary;
                    }
                }
            }

            // Strategy 2: Look for elements containing currency symbols
            const currencyElements = Array.from(allElements).filter(el => {
                const text = el.textContent;
                return text.includes('CHF') || text.includes('€') || text.includes('EUR');
            });

            for (const element of currencyElements) {
                const text = element.textContent.trim();
                if (isSalaryText(text)) {
                    const cleanSalary = extractSalary(text);
                    if (cleanSalary) {
                        console.log('Found salary by currency:', cleanSalary);
                        return cleanSalary;
                    }
                }
            }

            // Strategy 3: Look for elements near salary-related text
            const salaryKeywords = ['salary', 'salaire', 'gehalt', 'compensation', 'wage', 'pay'];
            for (const element of allElements) {
                const text = element.textContent.toLowerCase();
                if (salaryKeywords.some(keyword => text.includes(keyword))) {
                    // Check the element itself and its siblings
                    const parent = element.parentElement;
                    if (parent) {
                        for (const child of parent.children) {
                            const childText = child.textContent.trim();
                            if (isSalaryText(childText)) {
                                const cleanSalary = extractSalary(childText);
                                if (cleanSalary) {
                                    console.log('Found salary near keyword:', cleanSalary);
                                    return cleanSalary;
                                }
                            }
                        }
                    }
                }
            }

            console.log('No salary pattern found in page');
            return 'Salary not specified';
        });

        console.log('Final extracted salary:', salary);
        return salary;
    } catch (error) {
        console.error('Error extracting salary:', error);
        return 'Salary not specified';
    }
}

async function evaluateDescription(page) {
    try {
        const description = await page.evaluate(() => {
            const descElement = document.querySelector("#jobDescriptionText");
            if (descElement) {
                // Clone the element to avoid modifying the original
                const clonedElement = descElement.cloneNode(true);

                // Function to clean and preserve specific elements
                const cleanElement = (element) => {
                    // Remove unwanted elements
                    const unwantedSelectors = [
                        'script',
                        'style',
                        'iframe',
                        'object',
                        'embed',
                        '[onclick]',
                        '[onload]',
                        '[onunload]',
                        '[onabort]',
                        '[onerror]',
                        '[onresize]',
                        '[onscroll]',
                        '[onmouseover]',
                        '[onmouseout]',
                        '[onkeydown]',
                        '[onkeypress]',
                        '[onkeyup]'
                    ];

                    unwantedSelectors.forEach(selector => {
                        element.querySelectorAll(selector).forEach(el => el.remove());
                    });

                    // Clean attributes but preserve specific ones
                    const allowedAttributes = ['class', 'style'];
                    Array.from(element.getElementsByTagName('*')).forEach(el => {
                        Array.from(el.attributes).forEach(attr => {
                            if (!allowedAttributes.includes(attr.name)) {
                                el.removeAttribute(attr.name);
                            }
                        });
                    });

                    return element;
                };

                // Clean the cloned element
                const cleanedElement = cleanElement(clonedElement);

                // Get both HTML and text content
                const htmlContent = cleanedElement.innerHTML;

                // Process text content
                const processTextContent = (element) => {
                    let text = '';
                    const childNodes = element.childNodes;

                    for (let node of childNodes) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            text += node.textContent.trim() + ' ';
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            // Handle list items specially
                            if (node.tagName === 'LI') {
                                text += '\n• ' + processTextContent(node).trim();
                            } else if (node.tagName === 'BR' || node.tagName === 'P' || node.tagName === 'DIV') {
                                text += '\n' + processTextContent(node).trim();
                            } else {
                                text += processTextContent(node);
                            }
                        }
                    }
                    return text;
                };

                const textContent = processTextContent(cleanedElement)
                    .replace(/\s+/g, ' ')      // Normalize spaces
                    .replace(/\n\s+/g, '\n')   // Clean up extra spaces after newlines
                    .replace(/\n+/g, '\n')     // Normalize multiple newlines
                    .trim();

                // Add custom CSS to preserve formatting
                const customCSS = `
                    <style>
                        ul, ol { padding-left: 20px; margin: 8px 0; }
                        li { margin: 4px 0; }
                        p { margin: 8px 0; }
                        br { display: block; margin: 5px 0; }
                    </style>
                `;

                return {
                    html: customCSS + htmlContent,
                    text: textContent
                };
            }
            return {
                html: '<p>Description not found</p>',
                text: 'Description not found'
            };
        });
        return description;
    } catch (error) {
        console.error('Error extracting description:', error);
        return {
            html: '<p>Error loading description</p>',
            text: 'Error loading description'
        };
    }
}

async function processJob(page, url, isIndeed = true) {
    try {
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        // Attendre que le contenu soit chargé
        await page.waitForSelector('h1', { timeout: 5000 }).catch(() => {});
        
        // Extraire les informations
        const jobData = await page.evaluate(() => {
            const title = document.querySelector('h1')?.textContent?.trim() || '';
            const company = document.querySelector('[data-company-name]')?.textContent?.trim() || 
                          document.querySelector('.jobsearch-CompanyInfoContainer')?.textContent?.trim() || '';
            const location = document.querySelector('[data-locale]')?.textContent?.trim() || 
                           document.querySelector('.jobsearch-JobInfoHeader-subtitle')?.textContent?.trim() || '';
            const salary = document.querySelector('[data-salary-guid]')?.textContent?.trim() || '';
            
            // Extraire la description avec le texte brut et le HTML
            const descriptionElement = document.querySelector('#jobDescriptionText');
            const description = {
                text: descriptionElement?.textContent?.trim() || '',
                html: descriptionElement?.innerHTML?.trim() || ''
            };
            
            return {
                title,
                company,
                location,
                salary,
                description
            };
        });
        
        return jobData;
        
    } catch (error) {
        console.error('Error in processJob:', error);
        return null;
    }
}

async function scrapeJobs(links, onProgress, session = { stop: false }) {
    let browser = null;
    let page = null;

    try {
        browser = await initBrowser();
        page = await browser.newPage();
        let completedJobs = 0;

        for (const url of links) {
            // Vérifier si l'arrêt a été demandé
            if (session.stop) {
                console.log('Stopping scraping as requested');
                return; // Sortir immédiatement
            }

            console.log('\x1b[34m%s\x1b[0m', `\n📑 Processing job ${completedJobs + 1}/${links.length}`);
            
            try {
                const isIndeed = url.includes('indeed.com');
                let jobData = null;

                if (isIndeed) {
                    const transformedUrl = transformIndeedUrl(url);
                    if (transformedUrl) {
                        console.log('\x1b[35m%s\x1b[0m', '🌐 Starting scraping for:');
                        console.log('\x1b[90m%s\x1b[0m', 'Original URL:', url);
                        console.log('\x1b[92m%s\x1b[0m', 'Transformed URL:', transformedUrl);
                        
                        // Vérifier à nouveau l'arrêt avant de commencer le scraping
                        if (session.stop) {
                            console.log('Stopping before scraping job');
                            return;
                        }

                        jobData = await processJob(page, transformedUrl, true);
                        
                        // Vérifier l'arrêt après le scraping
                        if (session.stop) {
                            console.log('Stopping after scraping job');
                            return;
                        }

                        if (jobData) {
                            console.log('\x1b[32m%s\x1b[0m', '✅ Successfully scraped job data');

                            const descriptionHtml = typeof jobData.description === 'string' 
                                ? jobData.description 
                                : (jobData.description?.html || jobData.description?.text || '');
                            
                            const descriptionText = typeof jobData.description === 'string'
                                ? jobData.description.replace(/<[^>]*>/g, '')
                                : (jobData.description?.text || jobData.description?.html?.replace(/<[^>]*>/g, '') || '');

                            const message = {
                                type: 'newJob',
                                progress: Math.round((completedJobs + 1) / links.length * 100),
                                data: {
                                    ...jobData,
                                    url: url,
                                    description: {
                                        html: descriptionHtml,
                                        text: descriptionText
                                    }
                                }
                            };
                            onProgress(message);
                        }
                    }
                } else {
                    console.log('\x1b[33m%s\x1b[0m', '⚠️ Non-Indeed URL detected:', url);
                    const message = {
                        type: 'newJob',
                        progress: Math.round((completedJobs + 1) / links.length * 100),
                        data: {
                            title: 'Lien externe',
                            company: 'Non-Indeed',
                            location: '-',
                            salary: '-',
                            description: {
                                html: `<p>Lien externe: <a href="${url}" target="_blank">${url}</a></p>`,
                                text: `Lien externe: ${url}`
                            },
                            url: url,
                            isExternal: true
                        }
                    };
                    onProgress(message);
                }

                completedJobs++;
                
                // Vérifier l'arrêt avant le délai
                if (session.stop) {
                    console.log('Stopping before delay');
                    return;
                }

                if (isIndeed) {
                    const delayTime = randomDelay(500, 1000);
                    console.log('\x1b[36m%s\x1b[0m', `⏳ Waiting ${delayTime}ms before next job...`);
                    await delay(delayTime);
                }
            } catch (error) {
                console.error('\x1b[31m%s\x1b[0m', `❌ Error processing job ${url}:`, error);
                onProgress({
                    type: 'error',
                    message: `Erreur lors du traitement de l'offre: ${error.message}`
                });
                
                // Vérifier l'arrêt après une erreur
                if (session.stop) {
                    console.log('Stopping after error');
                    return;
                }
            }
        }
    } catch (error) {
        console.error('Fatal error in scrapeJobs:', error);
        throw error;
    } finally {
        // Nettoyer les ressources
        if (page) await page.close().catch(console.error);
        if (browser) await browser.close().catch(console.error);
    }
}

function transformIndeedUrl(url) {
    try {
        // Test de l'URL avec les deux formats
        const testUrl = "https://ch.indeed.com/Stellen?q=SEO&l=Basel%2C+BS&radius=100&sort=date&vjk=5d4028a87d5a446a";
        const testUrl2 = "https://ch.indeed.com/jobs?q=Marketing&l=Z%C3%BCrich%2C+ZH&sort=date&vjk=60a9a99740f930a6";
        console.log('Test conversion:', {
            input1: testUrl,
            output1: transformIndeedUrlInternal(testUrl),
            input2: testUrl2,
            output2: transformIndeedUrlInternal(testUrl2)
        });

        return transformIndeedUrlInternal(url);
    } catch (error) {
        console.error('Error transforming URL:', error);
        return null;
    }
}

function transformIndeedUrlInternal(url) {
    // Ignorer les URLs non-Indeed
    if (!url.includes('indeed.com')) {
        console.warn('\x1b[33m%s\x1b[0m', 'Non-Indeed URL detected:', url);
        return null;
    }

    // Si l'URL contient déjà viewjob, vérifier si elle a le paramètre from
    if (url.includes('viewjob')) {
        const finalUrl = !url.includes('from=shareddesktop') 
            ? url + (url.includes('?') ? '&' : '?') + 'from=shareddesktop'
            : url;
        console.log('\x1b[36m%s\x1b[0m', '🔄 URL already in viewjob format:', {
            original: url,
            final: finalUrl
        });
        return finalUrl;
    }

    // Extraire le vjk de l'URL, qu'elle soit en format Stellen ou jobs
    let vjkMatch = url.match(/[?&]vjk=([^&]+)/);
    if (vjkMatch && vjkMatch[1]) {
        // Nettoyer le vjk de tout paramètre supplémentaire
        const vjk = vjkMatch[1].split('&')[0];
        
        // Extraire le domaine de base (ex: ch.indeed.com)
        const baseUrl = url.match(/(https?:\/\/[^\/]+)/)[1];
        
        // Construire l'URL du job avec le paramètre from=shareddesktop
        const transformedUrl = `${baseUrl}/viewjob?jk=${vjk}&from=shareddesktop`;
        
        // Log coloré avec les deux URLs
        console.log('\x1b[32m%s\x1b[0m', '✨ URL transformation successful:');
        console.log('\x1b[90m%s\x1b[0m', 'Original:', url);
        console.log('\x1b[92m%s\x1b[0m', 'Transformed:', transformedUrl);
        console.log('\x1b[90m%s\x1b[0m', '-------------------');
        
        return transformedUrl;
    }

    console.warn('\x1b[31m%s\x1b[0m', '❌ No vjk parameter found in URL:', url);
    return null;
}

export { scrapeJobs, transformIndeedUrl }