# Job Search Automation Tool

A modern web application that automates job searching across multiple platforms, providing a streamlined experience for job seekers. This tool helps users efficiently manage and track job opportunities by automating searches and presenting results in a clean, organized interface.

![Application Screenshot](.github/screenshot.png)

## Features

- **Multi-Platform Job Search**: Automatically searches across multiple job platforms
- **Real-Time Updates**: Uses WebSocket for live search progress and results
- **Modern UI**: Clean and responsive interface with a focus on usability
- **Smart Description Handling**: Intelligent truncation of job descriptions with "Read More" functionality
- **Export Functionality**: Export search results to CSV for further analysis
- **Customizable Search**: Configure search parameters including keywords, location, and filters

## Technology Stack

### Frontend
- **React**: UI library for building the user interface
- **TypeScript**: Type-safe JavaScript for better development experience
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Shadcn/ui**: Modern UI component library
- **WebSocket**: Real-time communication with the backend

### Backend
- **Node.js**: JavaScript runtime for the server
- **Express**: Web application framework
- **Puppeteer**: Headless browser automation
- **WebSocket**: Real-time bidirectional communication
- **CSV-Parser**: Data export functionality

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation

1. Clone the repository:
   ```bash
   git clone [your-repository-url]
   cd [repository-name]
   ```

2. Install dependencies for both frontend and backend:
   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd server
   npm install
   cd ..
   ```

## Configuration

1. Create a `.env` file in the root directory:
   ```env
   PORT=3000
   WS_PORT=8080
   ```

2. Customize search parameters in `server/config.js` if needed

## Running the Application

1. Start the backend server:
   ```bash
   cd server
   node index.js
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   npm run dev
   ```

3. Access the application at `http://localhost:3000`

## Usage

1. **Starting a Search**:
   - Enter your search criteria (keywords, location)
   - Click "Start Search" to begin the automated search process

2. **Viewing Results**:
   - Results appear in real-time as they're found
   - Click "Read More" to view full job descriptions
   - Use the "View Job" button to open the original job posting

3. **Exporting Results**:
   - Click the "Export" button to download results as CSV
   - Use the exported data for tracking or analysis

## Use Cases

- **Job Seekers**: Efficiently search and track job opportunities across platforms
- **Recruiters**: Monitor job market trends and competitor postings
- **Market Research**: Analyze job market data and requirements
- **Career Planning**: Research skill requirements and salary ranges in different markets

## Screenshots

[Place your screenshot here]
Add your application screenshot to the `.github` folder and name it `screenshot.png` to showcase the user interface.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
