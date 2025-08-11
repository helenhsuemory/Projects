# Video Watch Party - YouTube Playback Testing

A React application that performs **actual YouTube video playback testing**. This application will really play YouTube videos and increase view counts.

## ⚠️ Important Warning

**This application performs ACTUAL video playback**:
- YouTube view counts WILL increase with each test run
- Videos are actually played from start to finish
- May not work in all browser environments due to YouTube API restrictions
- Use responsibly and only with videos you have permission to test

## Features

- ✅ Real YouTube video playback using YouTube IFrame API
- 📊 Real-time progress tracking with visual progress bars
- 🔄 Multiple test runs (1-5 runs maximum for safety)
- 📱 Responsive, modern UI with Tailwind CSS
- ⏱️ Actual video duration detection and tracking
- 🎯 Complete playback verification
- 🧹 Automatic cleanup and resource management

## Technology Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Beautiful icons
- **YouTube IFrame API** - For actual video playback

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager
- Modern web browser with JavaScript enabled
- Internet connection for YouTube API access

## Installation

1. **Clone or download the project files**

2. **Install dependencies:**
   ```bash
   npm install
   ```
   or
   ```bash
   yarn install
   ```

## Development

**Start the development server:**
```bash
npm run dev
```
or
```bash
yarn dev
```

The application will open automatically at `http://localhost:3000`

## Build for Production

**Create a production build:**
```bash
npm run build
```
or
```bash
yarn build
```

**Preview the production build:**
```bash
npm run preview
```
or
```bash
yarn preview
```

## Usage

1. **Enter a YouTube URL** in the video link field
   - Supports both `youtube.com/watch?v=` and `youtu.be/` formats
   - Example: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`

2. **Set the number of test runs** (1-5 maximum)
   - Each run will play the video completely from start to finish
   - YouTube view count will increase by the number of runs

3. **Click "Start Real Playback Test"**
   - The app will load the YouTube API
   - Create a hidden player for actual playback
   - Play the video completely for each test run
   - Show real-time progress with actual timestamps

4. **Monitor the progress**
   - See current playback time and percentage
   - Track overall test progress
   - View video title and duration (when available)

## How It Works

### YouTube API Integration
- Dynamically loads the YouTube IFrame API
- Creates hidden players for actual video playback
- Monitors real playback progress every 500ms
- Handles player states and errors gracefully

### Playback Process
1. **API Loading**: Loads YouTube IFrame API with timeout protection
2. **Player Creation**: Creates a hidden YouTube player with the video
3. **Playback Monitoring**: Tracks actual playback progress
4. **Completion Detection**: Detects when video reaches end
5. **Cleanup**: Properly destroys players between runs

### Safety Features
- Maximum 5 test runs to prevent abuse
- Timeout protection for API loading and playback
- Proper error handling and user feedback
- Resource cleanup on component unmount

## Browser Compatibility

- **Chrome/Chromium**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support
- **Edge**: ✅ Full support

**Note**: Some corporate/educational networks may block YouTube API access.

## Limitations

- Requires internet connection for YouTube API
- May not work with private/restricted videos
- Corporate firewalls may block YouTube API
- Rate limiting may apply for excessive usage
- Some browsers may require user interaction before autoplay

## Project Structure

```
video-watch-party/
├── public/
├── src/
│   ├── App.jsx          # Main App component
│   ├── index.css        # Tailwind CSS imports
│   └── main.jsx         # React entry point
├── VideoWatchParty.jsx  # Main component with YouTube integration
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
├── .eslintrc.cjs        # ESLint configuration
└── README.md            # This file
```

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for educational purposes.

## Disclaimer

This application is for testing and educational purposes only. Users are responsible for complying with YouTube's Terms of Service and using the application ethically. The developers are not responsible for any misuse of this application.

---

**⚠️ Remember**: This application performs actual video playback and will increase YouTube view counts. Use responsibly!
