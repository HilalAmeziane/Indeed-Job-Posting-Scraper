# 🚀 IndeedCrawler

> Save hours in your job search by automating the tedious part

![Application Screenshot](.github/screenshot.png)

## 🎯 Why This Tool?

Job hunting is time-consuming:
- ⏰ Manually copying job details is tedious
- 📝 Keeping track of interesting positions is a hassle
- 🗄️ Managing application history becomes chaotic
- 💼 Updating CVs and cover letters takes time

This tool lets you focus on what matters: **crafting perfect applications** while it handles the data gathering.

## ✨ How It Works

1. **Input**: Provide a CSV file with Indeed job URLs
2. **Magic**: The tool automatically scrapes:
   - 📋 Job titles
   - 🏢 Company names
   - 📍 Locations
   - 💰 Salaries (when available)
   - 📝 Full job descriptions
3. **Output**: Get a clean CSV export with all details

## 🎥 Demo

[Place your screenshot here]

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- A CSV file with Indeed job URLs

### Installation

```bash
# Clone the repository
git clone [your-repo-url]
cd indeed-job-scraper

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Configuration

Create a `.env` file in the root directory:
```env
PORT=3000
WS_PORT=8080
```

### Running the App

1. **Start the backend**:
```bash
cd server
node index.js
```

2. **Start the frontend** (in a new terminal):
```bash
npm run dev
```

3. Access the app at `http://localhost:3000`

## 📊 Input CSV Format

Your CSV file should look like this:
```csv
url
https://www.indeed.com/job-1
https://www.indeed.com/job-2
...
```

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express
- **Scraping**: Puppeteer
- **Real-time Updates**: WebSocket

## 📈 Future Plans

- [ ] Support for other job platforms
- [ ] Application tracking system

## 🤝 Contributing

Found a bug? Want to add a feature? Contributions are welcome!

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚖️ Legal Disclaimer

This project is for educational purposes only. Before using this tool:
- Ensure you comply with Indeed's Terms of Service
- Respect the website's robots.txt and rate limiting
- Do not use the collected data for commercial purposes
- Be aware that web scraping might be subject to legal restrictions in your jurisdiction

The creators and contributors of this project are not responsible for any misuse or legal consequences.

## 🙏 Acknowledgments

- Indeed for providing job listings
- All contributors who help improve this tool


</p>
