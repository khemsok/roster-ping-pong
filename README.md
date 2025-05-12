# Ping Pong Match Tracker

A client-side web application for tracking ping pong matches across multiple "rooms" using IndexedDB for storage.

## Features

- **Room Management**: Create separate rooms for different groups of players
- **Player Management**: Add, edit, and remove players within each room
- **Match Recording**: Record match results with scores and optional notes
- **Statistics & Visualization**: View leaderboards and statistics with simple charts
- **Data Management**: Export and import data for backup and sharing
- **Offline Support**: Works offline with Progressive Web App capabilities
- **No Server Required**: All data is stored locally in the browser

## Getting Started

### Local Development

1. Clone this repository
2. Open `index.html` in your browser
3. Start creating rooms and tracking matches!

### Deployment

The application can be deployed to any static hosting service:

#### GitHub Pages

1. Push the code to a GitHub repository
2. Navigate to the repository settings
3. Scroll down to the "GitHub Pages" section
4. Under "Source", select the branch containing your code (usually "main" or "master")
5. Click "Save"
6. Your site will be published at `https://[your-username].github.io/[repository-name]/`

Note: The application includes a `.nojekyll` file to ensure GitHub Pages serves the files correctly without processing them with Jekyll.

#### Netlify

1. Sign up for a Netlify account
2. Drag and drop the project folder to the Netlify dashboard
3. Your site will be deployed automatically

## PWA Support

This application supports Progressive Web App features, allowing it to be installed on mobile devices and used offline.

### Icons

For full PWA support, you need to create icon files:

1. Create a 192x192 pixel PNG icon and save it as `icons/icon-192x192.png`
2. Create a 512x512 pixel PNG icon and save it as `icons/icon-512x512.png`

You can use any image editing software to create these icons, or use online tools like:

- [Favicon.io](https://favicon.io/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## Technical Details

- **HTML/CSS/JavaScript**: Pure frontend implementation
- **IndexedDB**: Client-side database for data storage
- **No External Dependencies**: Built with vanilla JavaScript
- **Single-Page Application**: All functionality in one page
- **Responsive Design**: Works on mobile and desktop

## Database Structure

- **rooms**: Stores room metadata (name, description, etc.)
- **players**: Stores player data with roomId as index
- **matches**: Stores match results with roomId as index
- **settings**: Stores application configuration

## License

MIT License
