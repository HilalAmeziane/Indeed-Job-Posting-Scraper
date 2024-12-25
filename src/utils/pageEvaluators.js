export async function evaluateTitle(page) {
    return await page.evaluate(() => {
        // Sélecteurs pour les titres de poste individuels
        const jobTitleSelectors = [
            '[data-testid="jobsearch-JobInfoHeader-title"]',
            'h1.jobsearch-JobInfoHeader-title',
            '.jobsearch-JobInfoHeader-title',
            'h1[class*="JobInfoHeader"]',
            'h1[class*="jobtitle"]',
            '.jobsearch-ViewJobLayout-jobDisplay h1'
        ];

        // Sélecteurs pour les titres de page de recherche
        const searchTitleSelectors = [
            'h2.jobsearch-JobInfoHeader-title',
            '.jobsearch-SerpJobCard-title',
            '[data-testid="jobTitle"]'
        ];

        // Essayer d'abord les sélecteurs de poste individuel
        for (const selector of jobTitleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.textContent.trim();
            }
        }

        // Puis essayer les sélecteurs de page de recherche
        for (const selector of searchTitleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.textContent.trim();
            }
        }

        return 'Titre non trouvé';
    });
}

export async function evaluateLocation(page) {
    return await page.evaluate(() => {
        const locationSelectors = [
            // Sélecteurs spécifiques pour la page de détail
            '[data-testid="jobsearch-JobInfoHeader-locationText"]',
            '[data-testid="job-location"]',
            '.jobsearch-JobInfoHeader-subtitle div[data-testid="inlineHeader-companyLocation"]',
            '.jobsearch-CompanyInfoContainer div[data-testid="inlineHeader-companyLocation"]',
            // Sélecteurs pour la page de recherche
            '.company_location',
            '.job-location',
            '[class*="JobLocation"]',
            // Sélecteurs de secours
            '[data-testid*="location"]',
            '.location'
        ];

        for (const selector of locationSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent.trim();
                // Supprime le nom de l'entreprise s'il est présent
                const locationParts = text.split('•');
                const locationText = locationParts[locationParts.length - 1].trim();
                
                // Regex pour extraire "Ville, XX" (où XX est le code canton)
                const match = locationText.match(/([^,]+),\s*([A-Z]{2})/);
                if (match) {
                    return `${match[1].trim()}, ${match[2]}`;
                }
                return locationText;
            }
        }
        return 'Localisation non trouvée';
    });
}