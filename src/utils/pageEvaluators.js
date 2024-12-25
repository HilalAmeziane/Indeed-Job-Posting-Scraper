export async function evaluateTitle(page) {
    try {
        // Attendre que le titre soit chargé avec les sélecteurs Indeed
        await page.waitForSelector('h1.jobsearch-JobInfoHeader-title', { timeout: 10000 });
        
        const title = await page.evaluate(() => {
            const titleElement = document.querySelector('h1.jobsearch-JobInfoHeader-title');
            
            if (titleElement) {
                return titleElement.innerText.trim();
            }
            return 'Titre non trouvé';
        });

        console.log('Titre brut trouvé:', title);
        return title;
    } catch (error) {
        console.error('Erreur lors de la récupération du titre:', error);
        return 'Erreur lors de la récupération du titre';
    }
}

export async function evaluateLocation(page) {
    try {
        // Attendre que la localisation soit chargée avec les sélecteurs Indeed
        await page.waitForSelector('.jobsearch-CompanyInfoContainer .companyLocation', { timeout: 10000 });
        
        const location = await page.evaluate(() => {
            const locationElement = document.querySelector('.jobsearch-CompanyInfoContainer .companyLocation');
            
            if (locationElement) {
                const fullText = locationElement.innerText.trim();
                console.log('Texte complet de localisation:', fullText);
                
                // Extraire la ville et le canton (format typique: "Ville, Canton")
                const locationParts = fullText.split(',');
                if (locationParts.length >= 2) {
                    const city = locationParts[0].trim();
                    const canton = locationParts[1].trim();
                    return `${city}, ${canton}`;
                }
                return fullText;
            }
            return 'Localisation non trouvée';
        });

        console.log('Localisation finale:', location);
        return location;
    } catch (error) {
        console.error('Erreur lors de la récupération de la localisation:', error);
        return 'Erreur lors de la récupération de la localisation';
    }
}