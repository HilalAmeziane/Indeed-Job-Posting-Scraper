export async function evaluateTitle(page) {
    return await page.evaluate(() => {
        // Sélecteurs pour les titres de poste individuels
        const jobTitleSelectors = [
            // Page de détail du poste
            '[data-testid="jobsearch-JobInfoHeader-title"]',
            'h1.jobsearch-JobInfoHeader-title',
            '.jobsearch-JobInfoHeader-title',
            'h1[class*="JobInfoHeader"]',
            'h1[class*="jobtitle"]',
            '.jobsearch-ViewJobLayout-jobDisplay h1',
            // Page de recherche
            'h2.jobsearch-JobInfoHeader-title',
            '.jobsearch-SerpJobCard-title',
            '[data-testid="jobTitle"]',
            '.job-title'
        ];

        for (const selector of jobTitleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.textContent.trim();
            }
        }

        // Si aucun sélecteur ne fonctionne, chercher dans tous les h1/h2
        const titleElements = [...document.querySelectorAll('h1, h2')];
        for (const element of titleElements) {
            if (element.textContent.length > 0 && !element.textContent.includes('Indeed')) {
                return element.textContent.trim();
            }
        }

        return 'Titre non trouvé';
    });
}

export async function evaluateLocation(page) {
    return await page.evaluate(() => {
        const locationSelectors = [
            // Sélecteurs pour la page de détail
            '[data-testid="jobsearch-JobInfoHeader-locationText"]',
            '[data-testid="job-location"]',
            '.jobsearch-JobInfoHeader-subtitle div[data-testid="inlineHeader-companyLocation"]',
            '.jobsearch-CompanyInfoContainer div[data-testid="inlineHeader-companyLocation"]',
            '.jobsearch-InlineCompanyRating div:nth-child(2)',
            // Sélecteurs pour la page de recherche
            '.company_location',
            '.job-location',
            '[class*="JobLocation"]',
            // Sélecteurs génériques
            '[data-testid*="location"]',
            '.location',
            // Nouveaux sélecteurs
            '.css-1wh2kri',  // Sélecteur spécifique pour certaines pages Indeed
            '[class*="CompanyLocation"]'
        ];

        for (const selector of locationSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                let locationText = element.textContent.trim();
                
                // Nettoyer le texte
                // 1. Supprimer le nom de l'entreprise s'il est présent
                if (locationText.includes('•')) {
                    locationText = locationText.split('•').pop().trim();
                }
                
                // 2. Supprimer les parenthèses et leur contenu
                locationText = locationText.replace(/\([^)]*\)/g, '').trim();
                
                // 3. Chercher spécifiquement le format "Ville, XX"
                const match = locationText.match(/([^,]+),\s*([A-Z]{2})/);
                if (match) {
                    return `${match[1].trim()}, ${match[2]}`;
                }

                // 4. Si pas de match, essayer de trouver juste la ville et le canton
                const words = locationText.split(/[\s,]+/);
                for (let i = 0; i < words.length - 1; i++) {
                    if (words[i + 1].match(/^[A-Z]{2}$/)) {
                        return `${words[i]}, ${words[i + 1]}`;
                    }
                }

                return locationText;
            }
        }
        return 'Localisation non trouvée';
    });
}