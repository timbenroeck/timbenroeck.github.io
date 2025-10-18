// Movies-specific JavaScript functionality

// Global variables
let currentCategory = null;
let currentMovie = null;
let allMovies = [];
let filteredMovies = [];
let currentSort = 'title-asc';
let currentPage = 1;
let itemsPerPage = 50; // Show 50 movies per page
let isLoading = false;

// Initialize page
window.onload = function() {
    if (!initializePage()) {
        return; // Will redirect to login if auth fails
    }
    
    // Check for saved state in URL
    const savedState = getStateFromURL();
    if (savedState && savedState.page === 'movies') {
        restoreMoviesState(savedState);
    } else {
        loadCategories();
    }
};

// Restore movies state from URL
async function restoreMoviesState(state) {
    try {
        // Restore global state
        currentSort = state.sort || 'title-asc';
        currentPage = state.page_num || 1;
        itemsPerPage = state.items_per_page || 50;
        
        if (state.view === 'movie_detail' && state.movie_id) {
            // Restore movie detail view
            await restoreMovieDetail(state);
        } else if (state.view === 'movies_list' && state.category) {
            // Restore movies list view
            currentCategory = state.category;
            if (state.category.id === null) {
                await loadAllMovies();
            } else {
                await loadMovies(state.category.id, state.category.name);
            }
            
            // Restore search if any
            if (state.search_term) {
                document.getElementById('movie-search').value = state.search_term;
                performSearch();
            }
        } else {
            // Default to categories
            loadCategories();
        }
    } catch (error) {
        console.error('Error restoring movies state:', error);
        loadCategories();
    }
}

async function restoreMovieDetail(state) {
    try {
        // First load the category to get movie data
        currentCategory = state.category;
        let movies;
        
        if (state.category.id === null) {
            movies = await fetchAPI('get_vod_streams');
        } else {
            movies = await fetchAPI('get_vod_streams', { category_id: state.category.id });
        }
        
        // Find the specific movie
        const movie = movies.find(m => m.stream_id === state.movie_id);
        if (movie) {
            currentMovie = movie;
            const movieInfo = await fetchAPI('get_vod_info', { vod_id: movie.stream_id });
            showMovieDetails(movieInfo.info, movieInfo.movie_data);
        } else {
            // Movie not found, go to categories
            loadCategories();
        }
    } catch (error) {
        console.error('Error restoring movie detail:', error);
        loadCategories();
    }
}

// Save movies state to URL
function saveMoviesState(view, additionalData = {}) {
    const state = {
        page: 'movies',
        view: view,
        sort: currentSort,
        page_num: currentPage,
        items_per_page: itemsPerPage,
        category: currentCategory,
        ...additionalData
    };
    
    // Add search term if present
    const searchInput = document.getElementById('movie-search');
    if (searchInput && searchInput.value.trim()) {
        state.search_term = searchInput.value.trim();
    }
    
    saveStateToURL(state);
}

// Load movie categories
async function loadCategories() {
    isLoading = true;
    showLoading(true, 'Loading movie categories...');
    hideAllViews();

    try {
        const categories = await fetchAPI('get_vod_categories');
        displayCategories(categories);
        // Save categories view state
        saveMoviesState('categories');
    } catch (error) {
        console.error('Error loading categories:', error);
        showCacheStatus('Error loading categories. Please check your connection and try again.', 'danger');
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// Display categories
function displayCategories(categories) {
    const categoriesView = document.getElementById('categories-view');
    const categoriesList = document.getElementById('categories-list');
    
    categoriesList.innerHTML = '';

    // Add "All Categories" option first
    const allCol = document.createElement('div');
    allCol.className = 'col-md-6 col-lg-4 mb-3';
    
    allCol.innerHTML = `
        <div class="card category-card all-categories-card h-100" onclick="selectAllCategories()">
            <div class="card-body">
                <h6 class="card-title fw-bold">All Categories</h6>
            </div>
        </div>
    `;
    
    categoriesList.appendChild(allCol);

    // Sort categories alphabetically by name
    const sortedCategories = [...categories].sort((a, b) => {
        return (a.category_name || '').localeCompare(b.category_name || '');
    });

    // Add regular categories
    sortedCategories.forEach(category => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-3';
        
        col.innerHTML = `
            <div class="card category-card h-100" onclick="selectCategory(${category.category_id}, '${category.category_name.replace(/'/g, "\\'")}')">
                <div class="card-body">
                    <h6 class="card-title">${category.category_name}</h6>
                </div>
            </div>
        `;
        
        categoriesList.appendChild(col);
    });

    // Show main breadcrumb for category listing
    document.getElementById('main-breadcrumb').style.display = 'block';
    categoriesView.style.display = 'block';
}

// Select a specific category
function selectCategory(categoryId, categoryName) {
    currentCategory = { id: categoryId, name: categoryName };
    loadMovies(categoryId, categoryName);
}

// Select all categories
function selectAllCategories() {
    currentCategory = { id: null, name: 'All Categories' };
    loadAllMovies();
}

// Load movies for a specific category
async function loadMovies(categoryId, categoryName) {
    isLoading = true;
    showLoading(true, `Loading ${categoryName} movies...`);
    hideAllViews();

    try {
        const movies = await fetchAPI('get_vod_streams', { category_id: categoryId });
        isLoading = false; // Set loading to false before displaying
        displayMovies(movies, `Movies - ${categoryName}`);
        
        // Save movies list state
        saveMoviesState('movies_list');
        
        if (movies.length > 200) {
            showCacheStatus(`Loaded ${movies.length} movies. Using pagination for optimal performance.`, 'info');
        }
    } catch (error) {
        console.error('Error loading movies:', error);
        showCacheStatus('Error loading movies. Please check your connection and try again.', 'danger');
        showCategories();
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// Load all movies
async function loadAllMovies() {
    isLoading = true;
    showLoading(true, 'Loading all movies...');
    hideAllViews();

    try {
        const movies = await fetchAPI('get_vod_streams');
        isLoading = false; // Set loading to false before displaying
        displayMovies(movies, 'All Movies');
        
        // Save movies list state
        saveMoviesState('movies_list');
        
        if (movies.length > 500) {
            showCacheStatus(`Loaded ${movies.length} movies. Large catalog - search and pagination available for better performance.`, 'info');
        }
    } catch (error) {
        console.error('Error loading all movies:', error);
        showCacheStatus('Error loading movies. Please check your connection and try again.', 'danger');
        showCategories();
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// Display movies list with pagination
function displayMovies(movies, title) {
    const moviesView = document.getElementById('movies-view');
    const moviesTitle = document.getElementById('movies-title');
    const searchInput = document.getElementById('movie-search');
    const resultsCount = document.getElementById('search-results-count');
    const sortSelector = document.getElementById('sort-selector');
    const itemsPerPageSelect = document.getElementById('items-per-page');
    
    // Store movies globally for filtering
    allMovies = movies;
    
    // Apply initial sorting
    const sortedMovies = sortItems([...movies], currentSort);
    filteredMovies = sortedMovies;
    
    // Reset to first page
    currentPage = 1;
    
    moviesTitle.textContent = title;
    
    // Clear search
    searchInput.value = '';
    document.getElementById('clear-search-btn').style.display = 'none';
    
    // Set controls to current values
    sortSelector.value = currentSort;
    itemsPerPageSelect.value = itemsPerPage.toString();

    // Show appropriate breadcrumb
    document.getElementById('breadcrumb').style.display = 'block';
    document.getElementById('breadcrumb-category').textContent = currentCategory.name;

    // Update results count and render
    updateResultsDisplay();
    moviesView.style.display = 'block';
}

// Update results display with pagination
function updateResultsDisplay() {
    if (isLoading) return;
    
    const resultsCount = document.getElementById('search-results-count');
    const paginationInfo = document.getElementById('pagination-info');
    const paginationControls = document.getElementById('pagination-controls');
    
    // Get paginated data
    const paginatedData = paginateArray(filteredMovies, currentPage, itemsPerPage);
    
    // Update counts
    resultsCount.textContent = `Showing ${paginatedData.totalItems} ${paginatedData.totalItems === 1 ? 'movie' : 'movies'}`;
    
    if (paginatedData.totalItems > 0) {
        paginationInfo.textContent = `${paginatedData.startIndex}-${paginatedData.endIndex} of ${paginatedData.totalItems}`;
    } else {
        paginationInfo.textContent = '';
    }
    
    // Render current page
    renderMovies(paginatedData.data);
    
    // Update pagination controls
    paginationControls.innerHTML = createPaginationControls(paginatedData, 'goToPage');
    
    // Scroll to top of movies list
    document.getElementById('movies-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Render movie items (now only renders current page)
function renderMovies(movies) {
    const moviesList = document.getElementById('movies-list');
    
    if (movies.length === 0) {
        moviesList.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No movies found</h5>
                <p class="text-muted">Try adjusting your search terms</p>
            </div>
        `;
        return;
    }

    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();

    movies.forEach(movie => {
        const movieDiv = document.createElement('div');
        movieDiv.className = 'movie-item p-3 mb-2 border rounded';
        movieDiv.onclick = () => selectMovie(movie);
        
        // Enhanced movie display with more metadata
        const releaseYear = movie.year ? `<span class="badge bg-secondary me-2">${movie.year}</span>` : '';
        const rating = movie.rating ? `<span class="text-warning me-2"><i class="fas fa-star me-1"></i>${formatRating(movie.rating)}</span>` : '';
        const genre = movie.genre ? `<small class="text-muted">${movie.genre}</small>` : '';
        
        movieDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="me-3">
                    ${movie.stream_icon ? 
                        `<img src="${movie.stream_icon}" alt="Poster" style="width: 60px; height: 90px; object-fit: cover;" class="rounded movie-poster-thumb" loading="lazy">` : 
                        `<div style="width: 60px; height: 90px;" class="bg-light rounded d-flex align-items-center justify-content-center movie-poster-thumb">
                            <i class="fas fa-film text-muted"></i>
                        </div>`
                    }
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <h6 class="mb-0 me-2">${movie.title || movie.name}</h6>
                        ${releaseYear}
                        ${rating}
                    </div>
                    ${genre}
                    ${movie.plot ? `<p class="mb-0 mt-1 text-muted small" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${movie.plot}</p>` : ''}
                </div>
                <div>
                    <i class="fas fa-chevron-right text-muted"></i>
                </div>
            </div>
        `;
        
        fragment.appendChild(movieDiv);
    });
    
    moviesList.innerHTML = '';
    moviesList.appendChild(fragment);
}

// Select a movie to view details
function selectMovie(movie) {
    currentMovie = movie;
    showMovieDetails(movie);
    
    // Save movie detail state
    saveMoviesState('movie_detail', { movie_id: movie.stream_id });
}

// Show movie details
function showMovieDetails(movie) {
    hideAllViews();
    
    // Update title and basic info
    const movieTitle = document.getElementById('movie-detail-title');
    const moviePoster = document.getElementById('movie-poster');
    const movieRating = document.getElementById('movie-rating');
    const movieYear = document.getElementById('movie-year');
    const movieRuntime = document.getElementById('movie-runtime');
    const movieGenre = document.getElementById('movie-genre');
    const moviePlot = document.getElementById('movie-plot');
    const movieCast = document.getElementById('movie-cast');
    const movieDirector = document.getElementById('movie-director');
    const movieRelease = document.getElementById('movie-release');
    const movieUrl = document.getElementById('movie-url');
    const movieInfo = document.getElementById('movie-info');
    const trailerBtn = document.getElementById('trailer-btn');
    
    // Set title
    movieTitle.textContent = movie.title || movie.name || 'Unknown Title';
    
    // Set poster image
    if (movie.stream_icon) {
        moviePoster.src = movie.stream_icon;
        moviePoster.alt = movie.title || movie.name;
    } else {
        moviePoster.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
    }
    
    // Set rating
    movieRating.textContent = formatRating(movie.rating);
    
    // Set year
    movieYear.textContent = movie.year || 'Unknown Year';
    
    // Set runtime
    movieRuntime.innerHTML = `<i class="fas fa-clock me-1"></i>${formatRuntime(movie.episode_run_time)}`;
    
    // Set genre
    movieGenre.textContent = movie.genre || 'Genre Unknown';
    
    // Set plot/synopsis
    moviePlot.textContent = movie.plot || 'No synopsis available for this title.';
    
    // Set cast
    movieCast.textContent = movie.cast || 'Cast information not available';
    
    // Set director
    movieDirector.textContent = movie.director || 'Director information not available';
    
    // Set release date
    movieRelease.textContent = formatDate(movie.release_date);
    
    // Generate movie URL
    const playUrl = generateStreamUrl(movie, 'vod');
    movieUrl.value = playUrl;
    window.currentMovieUrl = playUrl; // Store for play function
    
    // Show/hide trailer button
    if (movie.youtube_trailer) {
        trailerBtn.style.display = 'inline-block';
        window.currentTrailer = movie.youtube_trailer;
    } else {
        trailerBtn.style.display = 'none';
        window.currentTrailer = null;
    }
    
    // Display movie info as formatted JSON
    movieInfo.textContent = JSON.stringify(movie, null, 2);
    
    // Show movie breadcrumb
    document.getElementById('movie-breadcrumb').style.display = 'block';
    document.getElementById('breadcrumb-movie-category').querySelector('a').textContent = currentCategory ? currentCategory.name : 'All Categories';
    document.getElementById('breadcrumb-movie-name').textContent = movie.title || movie.name || 'Unknown Movie';
    
    // Reset video containers
    document.getElementById('video-container').style.display = 'none';
    document.getElementById('trailer-container').style.display = 'none';
    
    document.getElementById('movie-details').style.display = 'block';
}

// Play movie
async function playMovie() {
    if (window.currentMovieUrl) {
        const videoContainer = document.getElementById('video-container');
        const trailerContainer = document.getElementById('trailer-container');
        const videoPlayer = document.getElementById('video-player');
        const playBtn = document.getElementById('play-btn');
        
        // Hide trailer if showing
        trailerContainer.style.display = 'none';
        
        // Show video container
        videoContainer.style.display = 'block';
        
        // Show loading status
        showCacheStatus(`Loading movie...`, 'info');
        
        try {
            // Use the new HLS-capable video player
            await setupVideoPlayer(
                videoPlayer, 
                window.currentMovieUrl, 
                currentMovie?.title || currentMovie?.name || 'movie'
            );
            
            // Try to play automatically
            videoPlayer.play().then(() => {
                showCacheStatus(`Playing ${currentMovie?.title || currentMovie?.name || 'movie'}`, 'success');
            }).catch(error => {
                console.log('Autoplay prevented by browser:', error);
                showCacheStatus(`Movie loaded - Click play to start`, 'info');
            });
            
            // Update play button
            playBtn.innerHTML = '<i class="fas fa-stop me-2"></i>Stop';
            playBtn.onclick = stopMovie;
            
            // Scroll to video
            videoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        } catch (error) {
            console.error('Error setting up video player:', error);
            showCacheStatus(`Error loading movie: ${error.message}`, 'danger');
        }
    }
}

// Stop movie
function stopMovie() {
    const videoContainer = document.getElementById('video-container');
    const videoPlayer = document.getElementById('video-player');
    const playBtn = document.getElementById('play-btn');
    
    // Hide video container and stop playback
    videoContainer.style.display = 'none';
    destroyVideoPlayer(videoPlayer);
    
    // Reset play button
    playBtn.innerHTML = '<i class="fas fa-play me-2"></i>Play';
    playBtn.onclick = playMovie;
    
    showCacheStatus('Playback stopped', 'info');
}

// Pagination control functions
function goToPage(page) {
    currentPage = page;
    updateResultsDisplay();
}

function changeItemsPerPage() {
    const select = document.getElementById('items-per-page');
    itemsPerPage = parseInt(select.value);
    currentPage = 1; // Reset to first page
    updateResultsDisplay();
}

// Handle sort change
function handleSortChange() {
    const sortSelector = document.getElementById('sort-selector');
    currentSort = sortSelector.value;
    
    // Apply sorting to current filtered movies
    filteredMovies = sortItems([...filteredMovies], currentSort);
    currentPage = 1; // Reset to first page after sort
    
    // Re-render with new sort
    updateResultsDisplay();
}

// Create debounced search function for better performance
const debouncedSearch = debounce(performSearch, 300);

// Handle search keypress
function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        performSearch();
    } else {
        // Use debounced search for real-time typing
        debouncedSearch();
    }
}

// Perform search with pagination reset
function performSearch() {
    if (isLoading) return;
    
    const searchInput = document.getElementById('movie-search');
    const clearBtn = document.getElementById('clear-search-btn');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Show/hide clear button
    clearBtn.style.display = searchTerm ? 'block' : 'none';
    
    // Filter movies
    const filtered = searchItems(allMovies, searchTerm);
    
    // Apply current sorting to filtered results
    filteredMovies = sortItems(filtered, currentSort);
    
    // Reset to first page after search
    currentPage = 1;
    
    // Update display
    updateResultsDisplay();
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('movie-search');
    const clearBtn = document.getElementById('clear-search-btn');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    // Reset to show all movies
    performSearch();
    
    // Focus back on search input
    searchInput.focus();
}

// Download movie
function downloadMovie() {
    if (window.currentMovieUrl && currentMovie) {
        const movieTitle = currentMovie.title || currentMovie.name || 'movie';
        const extension = currentMovie.container_extension || 'mp4';
        const filename = `${sanitizeFilename(movieTitle)}.${extension}`;
        
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = window.currentMovieUrl;
        link.download = filename;
        link.style.display = 'none';
        
        // Add link to document, click it, then remove it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showCacheStatus(`Starting download: ${filename}`, 'success');
    } else {
        showCacheStatus('No movie URL available for download', 'danger');
    }
}

// Sanitize filename for download
function sanitizeFilename(filename) {
    // Remove invalid characters for filenames
    return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}

// Copy movie URL
function copyMovieUrl() {
    if (window.currentMovieUrl) {
        copyToClipboard(window.currentMovieUrl).then(() => {
            const button = event.target.closest('button');
            showButtonFeedback(button);
        });
    }
}

// Copy movie URL from Streamsection
function copyMovieUrlTechnical() {
    const movieUrl = document.getElementById('movie-url');
    movieUrl.select();
    document.execCommand('copy');
    
    const button = event.target.closest('button');
    showButtonFeedback(button);
}

// Toggle trailer
function toggleTrailer() {
    if (window.currentTrailer) {
        const trailerContainer = document.getElementById('trailer-container');
        const youtubeTrailer = document.getElementById('youtube-trailer');
        const videoContainer = document.getElementById('video-container');
        const trailerBtn = document.getElementById('trailer-btn');
        
        if (trailerContainer.style.display === 'none' || trailerContainer.style.display === '') {
            // Show trailer
            videoContainer.style.display = 'none'; // Hide main video
            document.getElementById('video-player').pause(); // Pause main video
            
            youtubeTrailer.src = `https://www.youtube.com/embed/${window.currentTrailer}?autoplay=1`;
            trailerContainer.style.display = 'block';
            
            trailerBtn.innerHTML = '<i class="fas fa-times me-2"></i>Close Trailer';
            
            // Scroll to trailer
            trailerContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // Hide trailer
            trailerContainer.style.display = 'none';
            youtubeTrailer.src = '';
            
            trailerBtn.innerHTML = '<i class="fab fa-youtube me-2"></i>Trailer';
        }
    }
}

// Navigation functions
function showCategories() {
    hideAllViews();
    loadCategories();
}

function goBackToMovies() {
    if (currentCategory) {
        if (currentCategory.id === null) {
            loadAllMovies();
        } else {
            loadMovies(currentCategory.id, currentCategory.name);
        }
    } else {
        showCategories();
    }
}

function hideAllViews() {
    document.getElementById('categories-view').style.display = 'none';
    document.getElementById('movies-view').style.display = 'none';
    document.getElementById('movie-details').style.display = 'none';
    document.getElementById('breadcrumb').style.display = 'none';
    document.getElementById('main-breadcrumb').style.display = 'none';
    document.getElementById('movie-breadcrumb').style.display = 'none';
}
