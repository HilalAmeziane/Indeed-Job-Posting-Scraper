export async function evaluateTitle(page) {
    try {
        // Attendre que l'un des sélecteurs soit présent
        await page.waitForSelector([
            'h1.jobsearch-JobInfoHeader-title',
            '.jobsearch-JobInfoHeader-title-container h1',
            '[data-testid="jobsearch-JobInfoHeader-title"]'
        ].join(','), { timeout: 15000 });

        const title = await page.evaluate(() => {
            const titleElement = 
                document.querySelector('h1.jobsearch-JobInfoHeader-title') ||
                document.querySelector('.jobsearch-JobInfoHeader-title-container h1') ||
                document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]');
            return titleElement ? titleElement.textContent.trim() : null;
        });

        return title || 'Titre non trouvé';
    } catch (error) {
        console.error('❌ Erreur lors de l\'évaluation du titre:', error);

        // Ajouter un log pour afficher le contenu de la page si un sélecteur échoue
        const pageContent = await page.content();
        console.log('Contenu de la page (HTML) :', pageContent);

        return null;
    }
}

export async function evaluateLocation(page) {
    try {
        // Attendre que l'un des sélecteurs soit présent
        await page.waitForSelector([
            '.jobsearch-CompanyInfoContainer .companyLocation',
            '[data-testid="job-location"]',
            '.jobsearch-JobInfoHeader-subtitle .companyLocation',
            '[data-testid="inlineHeader-companyLocation"]'
        ].join(','), { timeout: 15000 });

        const location = await page.evaluate(() => {
            const locationElement = 
                document.querySelector('.jobsearch-CompanyInfoContainer .companyLocation') ||
                document.querySelector('[data-testid="job-location"]') ||
                document.querySelector('.jobsearch-JobInfoHeader-subtitle .companyLocation') ||
                document.querySelector('[data-testid="inlineHeader-companyLocation"]');
            return locationElement ? locationElement.textContent.trim() : null;
        });

        return location || 'Localisation non trouvée';
    } catch (error) {
        console.error('❌ Erreur lors de l\'évaluation de la localisation:', error);

        // Ajouter un log pour afficher le contenu de la page si un sélecteur échoue
        const pageContent = await page.content();
        console.log('Contenu de la page (HTML) :', pageContent);

        return null;
    }
}

