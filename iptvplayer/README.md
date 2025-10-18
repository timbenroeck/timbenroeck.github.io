# IPTV Player Web App

A simple, client-side web application for navigating and playing IPTV streams using the Xtream API.

## Features

✅ **Secure Authentication**: Base64 encoded credentials in URL parameters  
✅ **Content Navigation**: Browse Live TV, Movies, and Series  
✅ **Category Browsing**: Organized content categories + "All Categories" option  
✅ **Advanced Search & Sort**: Real-time search by title, genre, cast, director, year with multiple sorting options  
✅ **Netflix-Style UI**: Cinematic movie/show detail pages with posters and metadata  
✅ **Stream Details**: View rich content information with trailers and Stream Details  
✅ **Video Player**: Built-in HTML5 video player with YouTube trailer integration  
✅ **High Performance**: Client-side caching, pagination, and optimized rendering for large catalogs  
✅ **Smart Caching**: 30-minute localStorage cache with automatic cleanup and cache status indicators  
✅ **Responsive Design**: Modern Bootstrap-based UI with smooth animations  
✅ **Bookmark Support**: Generate shareable links with encoded credentials  

## How to Use

### 1. Setup
1. Download or clone this repository
2. Host the files on any web server (Apache, Nginx, or even a simple HTTP server)
3. Or open `login.html` directly in your browser for local testing

### 2. Login Process
1. Open `login.html` in your browser
2. Enter your Xtream API credentials:
   - **Server URL**: Your IPTV provider's base URL (e.g., `http://iptv-provider-host.com`)
   - **Username**: Your IPTV username 
   - **Password**: Your IPTV password 
3. Click "Login & Generate Link"
4. **Important**: Bookmark the generated link for future access
5. Click "Go to App" or use your bookmarked link

### 3. Navigation
1. **Main Menu**: Choose between Live TV, Movies, or Series
2. **Categories**: Browse specific categories or select "All Categories" to see everything
3. **Streams**: View available streams with enhanced thumbnails and metadata
4. **Search & Sort**: 
   - **Search** by typing keywords and clicking the search button (or pressing Enter)
   - **Search fields**: title, genre, cast, director, year, or plot keywords
   - **Sort** by:
     - Title (A-Z or Z-A)
     - Rating (High to Low or Low to High)
     - Release Date (Newest or Oldest)
     - Date Added (Recently Added or Oldest Added)
5. **Stream Details**: 
   - Netflix-style detail page with poster, ratings, and synopsis
   - Watch YouTube trailers (when available)
   - Copy stream URL to clipboard
   - View stream information (JSON)
   - Play stream using built-in video player

## API Endpoints Used

This app utilizes the following Xtream API endpoints:

### Live TV
- `get_live_categories` - Get live TV categories
- `get_live_streams` - Get live streams (all or by category)

### Movies (VOD)  
- `get_vod_categories` - Get movie categories
- `get_vod_streams` - Get movie streams (all or by category)

### Series
- `get_series_categories` - Get series categories  
- `get_series` - Get series (all or by category)

## Stream URL Formats

The app generates playable URLs in these formats:

- **Live TV**: `{base_url}/live/{username}/{password}/{stream_id}.m3u8`
- **Movies**: `{base_url}/movie/{username}/{password}/{stream_id}.{extension}`
- **Series**: `{base_url}/series/{username}/{password}/{series_id}.m3u8`

## Performance Features

### **Advanced IndexedDB Caching System**
- **IndexedDB primary storage**: High-performance browser database with large storage capacity
- **localStorage fallback**: Automatic fallback to localStorage if IndexedDB is unavailable
- **30-minute cache duration**: API responses cached for optimal balance of performance and freshness
- **Automatic cleanup**: Expired entries removed automatically on app startup and storage full events
- **Cache statistics**: Real-time cache type and entry count display in settings
- **Smart error handling**: Graceful degradation with comprehensive error recovery
- **No server required**: All caching happens client-side with browser-native storage

#### **StreamAdvantages of IndexedDB Over localStorage:**
- **Storage Capacity**: ~1GB+ vs ~5-10MB with localStorage
- **Performance**: Asynchronous operations (non-blocking) vs synchronous localStorage
- **Data Types**: Direct object storage vs JSON stringification required for localStorage
- **Querying**: Built-in indexing and range queries vs manual key iteration
- **Transactions**: ACID transactions for data integrity
- **Browser Support**: Universal support in modern browsers (IE10+)

### **Optimized for Large Catalogs**
- **Pagination**: Large movie/series lists split into manageable pages (25/50/100/200 items)
- **Lazy loading**: Images load only when needed (`loading="lazy"`)
- **Efficient rendering**: Uses DocumentFragment for better DOM performance
- **Debounced search**: Real-time search with 300ms debounce to reduce API calls

### **Search & Sort Without API Calls**
- **Client-side filtering**: Search operates on cached data
- **Instant sorting**: Sort options work without server requests
- **Full-text search**: Searches through title, plot, cast, director, genre, and year
- **Persistent state**: Pagination and sort preferences maintained during search

## Security Notes

- Credentials are base64 encoded in URL parameters (not encrypted)
- This is a client-side only application - no server-side storage
- Keep your bookmark URLs private as they contain your credentials
- Consider using HTTPS when hosting this application

## Browser Compatibility

- Modern browsers with HTML5 video support
- JavaScript must be enabled
- CORS may need to be configured on your IPTV provider's server

## Troubleshooting

### Common Issues

1. **CORS Errors**: Your IPTV provider may need to allow cross-origin requests
2. **Video Won't Play**: 
   - Check if the stream URL is accessible
   - Some streams may require specific codecs
   - Try copying the URL and testing in VLC or another player
3. **Authentication Fails**: Verify your credentials and server URL format

## Development

This is a pure client-side application using:
- **HTML5** for structure
- **Bootstrap 5** for styling and components
- **Font Awesome** for icons
- **Vanilla JavaScript** for functionality

No build process or dependencies required - just serve the static files!

## License

Free to use and modify for personal use.
