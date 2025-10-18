// Series-specific JavaScript functionality

// Global variables
let currentCategory = null;
let currentSeries = null;
let allSeries = [];
let filteredSeries = [];
let currentSort = 'title-asc';
let currentPage = 1;
let itemsPerPage = 50;
let isLoading = false;
let currentSeriesInfo = null;
let currentSeason = 1;
let currentEpisodes = [];

// Initialize page
window.onload = function() {
    if (!initializePage()) {
        return; // Will redirect to login if auth fails
    }
    
    // Check for saved state in URL
    const savedState = getStateFromURL();
    if (savedState && savedState.page === 'series') {
        restoreSeriesState(savedState);
    } else {
        loadCategories();
    }
};

// Restore series state from URL
async function restoreSeriesState(state) {
    try {
        // Restore global state
        currentSort = state.sort || 'title-asc';
        currentPage = state.page_num || 1;
        itemsPerPage = state.items_per_page || 50;
        
        if (state.view === 'series_detail' && state.series_id) {
            // Restore series detail view
            await restoreSeriesDetail(state);
        } else if (state.view === 'series_list' && state.category) {
            // Restore series list view
            currentCategory = state.category;
            if (state.category.id === null) {
                await loadAllSeries();
            } else {
                await loadSeries(state.category.id, state.category.name);
            }
            
            // Restore search if any
            if (state.search_term) {
                document.getElementById('series-search').value = state.search_term;
                performSearch();
            }
        } else {
            // Default to categories
            loadCategories();
        }
    } catch (error) {
        console.error('Error restoring series state:', error);
        loadCategories();
    }
}

async function restoreSeriesDetail(state) {
    try {
        // First load the category to get series data
        currentCategory = state.category;
        let seriesList;
        
        if (state.category.id === null) {
            seriesList = await fetchAPI('get_series');
        } else {
            seriesList = await fetchAPI('get_series', { category_id: state.category.id });
        }
        
        // Find the specific series
        const series = seriesList.find(s => s.series_id === state.series_id);
        if (series) {
            currentSeries = series;
            const seriesInfo = await fetchAPI('get_series_info', { series_id: series.series_id });
            currentSeason = state.current_season || 1;
            showSeriesDetails(seriesInfo, series);
        } else {
            // Series not found, go to categories
            loadCategories();
        }
    } catch (error) {
        console.error('Error restoring series detail:', error);
        loadCategories();
    }
}

// Save series state to URL
function saveSeriesState(view, additionalData = {}) {
    const state = {
        page: 'series',
        view: view,
        sort: currentSort,
        page_num: currentPage,
        items_per_page: itemsPerPage,
        category: currentCategory,
        current_season: currentSeason,
        ...additionalData
    };
    
    // Add search term if present
    const searchInput = document.getElementById('series-search');
    if (searchInput && searchInput.value.trim()) {
        state.search_term = searchInput.value.trim();
    }
    
    saveStateToURL(state);
}

// Load series categories
async function loadCategories() {
    isLoading = true;
    showLoading(true, 'Loading series categories...');
    hideAllViews();

    try {
        const categories = await fetchAPI('get_series_categories');
        displayCategories(categories);
        // Save categories view state
        saveSeriesState('categories');
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

    categoriesView.style.display = 'block';
}

// Select a specific category
function selectCategory(categoryId, categoryName) {
    currentCategory = { id: categoryId, name: categoryName };
    loadSeries(categoryId, categoryName);
}

// Select all categories
function selectAllCategories() {
    currentCategory = { id: null, name: 'All Categories' };
    loadAllSeries();
}

// Load series for a specific category
async function loadSeries(categoryId, categoryName) {
    isLoading = true;
    showLoading(true, `Loading ${categoryName} series...`);
    hideAllViews();

    try {
        const series = await fetchAPI('get_series', { category_id: categoryId });
        isLoading = false; // Set loading to false before displaying
        displaySeries(series, `Series - ${categoryName}`);
        
        // Save series list state
        saveSeriesState('series_list');
        
        if (series.length > 200) {
            showCacheStatus(`Loaded ${series.length} series. Using pagination for optimal performance.`, 'info');
        }
    } catch (error) {
        console.error('Error loading series:', error);
        showCacheStatus('Error loading series. Please check your connection and try again.', 'danger');
        showCategories();
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// Load all series
async function loadAllSeries() {
    isLoading = true;
    showLoading(true, 'Loading all series...');
    hideAllViews();

    try {
        const series = await fetchAPI('get_series');
        isLoading = false; // Set loading to false before displaying
        displaySeries(series, 'All Series');
        
        // Save series list state
        saveSeriesState('series_list');
        
        if (series.length > 500) {
            showCacheStatus(`Loaded ${series.length} series. Large catalog - search and sort available for better performance.`, 'info');
        }
    } catch (error) {
        console.error('Error loading all series:', error);
        showCacheStatus('Error loading series. Please check your connection and try again.', 'danger');
        showCategories();
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// Display series list with pagination
function displaySeries(series, title) {
    const seriesView = document.getElementById('series-view');
    const seriesTitle = document.getElementById('series-title');
    const searchInput = document.getElementById('series-search');
    const resultsCount = document.getElementById('search-results-count');
    const sortSelector = document.getElementById('sort-selector');
    const itemsPerPageSelect = document.getElementById('items-per-page');
    
    // Store series globally for filtering
    allSeries = series;
    
    // Apply initial sorting
    const sortedSeries = sortItems([...series], currentSort);
    filteredSeries = sortedSeries;
    
    // Reset to first page
    currentPage = 1;
    
    seriesTitle.textContent = title;
    
    // Clear search
    searchInput.value = '';
    document.getElementById('clear-search-btn').style.display = 'none';
    
    // Set controls to current values
    sortSelector.value = currentSort;
    itemsPerPageSelect.value = itemsPerPage.toString();

    // Update breadcrumb
    document.getElementById('breadcrumb').style.display = 'block';
    document.getElementById('breadcrumb-category').textContent = currentCategory.name;

    // Update results count and render
    updateResultsDisplay();
    seriesView.style.display = 'block';
}

// Update results display with pagination
function updateResultsDisplay() {
    if (isLoading) return;
    
    const resultsCount = document.getElementById('search-results-count');
    const paginationInfo = document.getElementById('pagination-info');
    const paginationControls = document.getElementById('pagination-controls');
    
    // Get paginated data
    const paginatedData = paginateArray(filteredSeries, currentPage, itemsPerPage);
    
    // Update counts
    resultsCount.textContent = `Showing ${paginatedData.totalItems} ${paginatedData.totalItems === 1 ? 'series' : 'series'}`;
    
    if (paginatedData.totalItems > 0) {
        paginationInfo.textContent = `${paginatedData.startIndex}-${paginatedData.endIndex} of ${paginatedData.totalItems}`;
    } else {
        paginationInfo.textContent = '';
    }
    
    // Render current page
    renderSeries(paginatedData.data);
    
    // Update pagination controls
    paginationControls.innerHTML = createPaginationControls(paginatedData, 'goToPage');
    
    // Scroll to top of series list
    document.getElementById('series-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Render series items (now only renders current page)
function renderSeries(series) {
    const seriesList = document.getElementById('series-list');
    
    if (series.length === 0) {
        seriesList.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No series found</h5>
                <p class="text-muted">Try adjusting your search terms</p>
            </div>
        `;
        return;
    }

    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();

    series.forEach(seriesItem => {
        const seriesDiv = document.createElement('div');
        seriesDiv.className = 'series-item p-3 mb-2 border rounded';
        seriesDiv.onclick = () => selectSeries(seriesItem);
        
        // Enhanced series display with more metadata
        const releaseYear = seriesItem.year ? `<span class="badge bg-secondary me-2">${seriesItem.year}</span>` : '';
        const rating = seriesItem.rating ? `<span class="text-warning me-2"><i class="fas fa-star me-1"></i>${formatRating(seriesItem.rating)}</span>` : '';
        const genre = seriesItem.genre ? `<small class="text-muted">${seriesItem.genre}</small>` : '';
        
        seriesDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="me-3">
                    ${seriesItem.cover ? 
                        `<img src="${seriesItem.cover}" alt="Poster" style="width: 60px; height: 90px; object-fit: cover;" class="rounded series-poster-thumb" loading="lazy">` : 
                        `<div style="width: 60px; height: 90px;" class="bg-light rounded d-flex align-items-center justify-content-center series-poster-thumb">
                            <i class="fas fa-tv text-muted"></i>
                        </div>`
                    }
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <h6 class="mb-0 me-2">${seriesItem.title || seriesItem.name}</h6>
                        ${releaseYear}
                        ${rating}
                    </div>
                    ${genre}
                    ${seriesItem.plot ? `<p class="mb-0 mt-1 text-muted small" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${seriesItem.plot}</p>` : ''}
                </div>
                <div>
                    <i class="fas fa-chevron-right text-muted"></i>
                </div>
            </div>
        `;
        
        fragment.appendChild(seriesDiv);
    });
    
    seriesList.innerHTML = '';
    seriesList.appendChild(fragment);
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

// Select a series to view details
async function selectSeries(series) {
    currentSeries = series;
    isLoading = true;
    showLoading(true, 'Loading series details...');
    hideAllViews();

    try {
        // Get detailed series information including seasons and episodes
        const seriesInfo = await fetchAPI('get_series_info', { series_id: series.series_id });
        showSeriesDetails(seriesInfo, series);
        
        // Save series detail state
        saveSeriesState('series_detail', { series_id: series.series_id });
    } catch (error) {
        console.error('Error fetching series info:', error);
        showCacheStatus('Error fetching series details. Please try again.', 'danger');
        goBackToSeries();
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// Show comprehensive series details with seasons and episodes
function showSeriesDetails(seriesApiResponse, originalSeries) {
    hideAllViews();
    
    currentSeriesInfo = seriesApiResponse;
    const info = seriesApiResponse.info;
    const seasons = seriesApiResponse.seasons;
    const episodes = seriesApiResponse.episodes;
    
    // Update title and basic info
    const seriesTitle = document.getElementById('series-title');
    const seriesPoster = document.getElementById('series-poster');
    const seriesRating = document.getElementById('series-rating');
    const seriesYear = document.getElementById('series-year');
    const seriesRuntime = document.getElementById('series-runtime');
    const seriesGenre = document.getElementById('series-genre');
    const seriesPlot = document.getElementById('series-plot');
    const seriesCast = document.getElementById('series-cast');
    const seriesDirector = document.getElementById('series-director');
    const seriesRelease = document.getElementById('series-release');
    const trailerBtn = document.getElementById('trailer-btn');
    
    // Set title
    seriesTitle.textContent = info.name || info.title || 'Unknown Title';
    
    // Set poster image
    if (info.cover) {
        seriesPoster.src = info.cover;
        seriesPoster.alt = info.name || info.title;
    } else {
        seriesPoster.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
    }
    
    // Set rating
    seriesRating.textContent = info.rating ? parseFloat(info.rating).toFixed(1) : 'N/A';
    
    // Set year
    seriesYear.textContent = info.year ? info.year : 'Unknown Year';
    
    // Set runtime (episode runtime)
    if (info.episode_run_time && info.episode_run_time !== "0") {
        seriesRuntime.innerHTML = `<i class="fas fa-clock me-1"></i>${info.episode_run_time}m per episode`;
    } else {
        seriesRuntime.innerHTML = `<i class="fas fa-clock me-1"></i>Runtime Unknown`;
    }
    
    // Set genre
    seriesGenre.textContent = info.genre || 'Genre Unknown';
    
    // Set plot/synopsis
    seriesPlot.textContent = info.plot || 'No synopsis available for this series.';
    
    // Set cast
    seriesCast.textContent = info.cast || 'Cast information not available';
    
    // Set director
    seriesDirector.textContent = info.director || 'Director information not available';
    
    // Set release date
    if (info.release_date || info.releaseDate) {
        const releaseDate = new Date(info.release_date || info.releaseDate);
        seriesRelease.textContent = releaseDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        seriesRelease.textContent = 'Unknown';
    }
    
    // Show/hide trailer button
    if (info.youtube_trailer) {
        trailerBtn.style.display = 'inline-block';
        trailerBtn.onclick = () => toggleTrailer(info.youtube_trailer, null);
    } else {
        trailerBtn.style.display = 'none';
    }
    
    // Display seasons and initialize with first season
    displaySeasons(seasons, episodes);
    
    // Set current season to first available season
    if (seasons && seasons.length > 0) {
        currentSeason = seasons[0].season_number;
        displayEpisodes(episodes[currentSeason] || [], seasons.find(s => s.season_number === currentSeason));
    }
    
    // Update technical details
    const seriesUrlInput = document.getElementById('series-url');
    const seriesInfoPre = document.getElementById('series-info');
    
    // Initially clear the URL (will be populated when an episode is selected)
    seriesUrlInput.value = '';
    seriesUrlInput.placeholder = 'Select an episode to see its stream URL';
    
    // Display full series info as JSON
    seriesInfoPre.textContent = JSON.stringify(seriesApiResponse, null, 2);
    
    // Hide video/trailer containers initially
    document.getElementById('video-container').style.display = 'none';
    document.getElementById('trailer-container').style.display = 'none';
    
    document.getElementById('series-details').style.display = 'block';
}

// Display seasons navigation
function displaySeasons(seasons, episodes) {
    const seasonsContainer = document.getElementById('seasons-container');
    
    if (!seasons || seasons.length === 0) {
        seasonsContainer.innerHTML = '<p class="text-muted">No season information available</p>';
        return;
    }
    
    seasonsContainer.innerHTML = '';
    
    // Create season selector tabs
    const seasonTabs = document.createElement('div');
    seasonTabs.className = 'season-tabs mb-4';
    
    seasons.forEach((season, index) => {
        const seasonButton = document.createElement('button');
        seasonButton.className = `btn btn-outline-primary me-2 mb-2 season-btn ${index === 0 ? 'active' : ''}`;
        seasonButton.textContent = `${season.name} (${season.episode_count} episodes)`;
        seasonButton.onclick = () => selectSeason(season.season_number, seasons, episodes);
        
        seasonTabs.appendChild(seasonButton);
    });
    
    seasonsContainer.appendChild(seasonTabs);
    
    // Create episodes container
    const episodesContainer = document.createElement('div');
    episodesContainer.id = 'episodes-list';
    episodesContainer.className = 'episodes-list';
    
    seasonsContainer.appendChild(episodesContainer);
}

// Select a season and display its episodes
function selectSeason(seasonNumber, seasons, episodes) {
    currentSeason = seasonNumber;
    
    // Update active season button
    document.querySelectorAll('.season-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Find season info
    const seasonInfo = seasons.find(s => s.season_number === seasonNumber);
    const seasonEpisodes = episodes[seasonNumber] || [];
    
    displayEpisodes(seasonEpisodes, seasonInfo);
    
    // Update state to include current season
    if (currentSeries) {
        saveSeriesState('series_detail', { series_id: currentSeries.series_id });
    }
}

// Display episodes for the current season
function displayEpisodes(episodes, seasonInfo) {
    const episodesContainer = document.getElementById('episodes-list');
    currentEpisodes = episodes;
    
    if (!episodes || episodes.length === 0) {
        episodesContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-tv fa-2x text-muted mb-3"></i>
                <h6 class="text-muted">No episodes available</h6>
                <p class="text-muted small">Episodes for this season are not currently available</p>
            </div>
        `;
        return;
    }
    
    episodesContainer.innerHTML = '';
    
    // Season header
    if (seasonInfo) {
        const seasonHeader = document.createElement('div');
        seasonHeader.className = 'season-header mb-3';
        seasonHeader.innerHTML = `
            <div class="d-flex align-items-center">
                ${seasonInfo.cover ? 
                    `<img src="${seasonInfo.cover}" alt="${seasonInfo.name}" class="season-poster me-3" style="width: 80px; height: 120px; object-fit: cover;">` :
                    ''
                }
                <div>
                    <h5 class="mb-1">${seasonInfo.name}</h5>
                    <p class="text-muted mb-0">${seasonInfo.episode_count} episodes</p>
                    ${seasonInfo.air_date ? `<small class="text-muted">Aired: ${new Date(seasonInfo.air_date).getFullYear()}</small>` : ''}
                </div>
            </div>
        `;
        episodesContainer.appendChild(seasonHeader);
    }
    
    // Episodes list
    const episodesGrid = document.createElement('div');
    episodesGrid.className = 'episodes-grid row';
    
    episodes.forEach((episode, index) => {
        const episodeCard = document.createElement('div');
        episodeCard.className = 'col-12 mb-3';
        
        episodeCard.innerHTML = `
            <div class="episode-card card">
                <div class="row g-0">
                    <div class="col-md-4 col-lg-3">
                        <div class="episode-thumbnail position-relative" onclick="playEpisode('${episode.id}', ${episode.episode_num}, '${episode.title.replace(/'/g, "\\'")}')">
                            <img src="${episode.info?.movie_image || episode.info?.cover_big || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVwaXNvZGU8L3RleHQ+PC9zdmc+'}" 
                                 alt="Episode ${episode.episode_num}" 
                                 class="img-fluid episode-thumb" 
                                 style="width: 100%; height: 120px; object-fit: cover; cursor: pointer;">
                            <div class="play-overlay">
                                <i class="fas fa-play"></i>
                            </div>
                            ${episode.info?.duration ? `<span class="duration-badge">${episode.info.duration}</span>` : ''}
                        </div>
                    </div>
                    <div class="col-md-8 col-lg-9">
                        <div class="card-body py-2">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="episode-title mb-1">Episode ${episode.episode_num}: ${episode.title}</h6>
                                ${episode.info?.rating ? `<span class="badge bg-warning text-dark"><i class="fas fa-star"></i> ${episode.info.rating}</span>` : ''}
                            </div>
                            <p class="episode-plot text-muted small mb-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                ${episode.info?.plot || 'No description available for this episode.'}
                            </p>
                            <div class="episode-meta d-flex align-items-center justify-content-between">
                                <small class="text-muted">
                                    ${episode.info?.release_date ? `Aired: ${new Date(episode.info.release_date).toLocaleDateString()}` : ''}
                                </small>
                                <div class="episode-actions">
                                    <button class="btn btn-primary btn-sm me-2" onclick="playEpisode('${episode.id}', ${episode.episode_num}, '${episode.title.replace(/'/g, "\\'")}')">
                                        <i class="fas fa-play me-1"></i>Play
                                    </button>
                                    <button class="btn btn-outline-secondary btn-sm me-2" onclick="copyEpisodeUrl('${episode.id}', '${episode.container_extension}')">
                                        <i class="fas fa-copy me-1"></i>Copy URL
                                    </button>
                                    <button class="btn btn-outline-success btn-sm" onclick="downloadEpisode('${episode.id}', '${episode.container_extension}', '${episode.title.replace(/'/g, "\\'")}')">
                                        <i class="fas fa-download me-1"></i>Download
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add click handler to the episode card text area (not thumbnail or buttons)
        episodeCard.addEventListener('click', (e) => {
            // Only handle clicks that are not on buttons or the thumbnail
            if (!e.target.closest('button') && !e.target.closest('.episode-thumbnail')) {
                // Just scroll to episode for better visibility
                episodeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        episodesGrid.appendChild(episodeCard);
    });
    
    episodesContainer.appendChild(episodesGrid);
}

// Play a specific episode
function playEpisode(episodeId, episodeNum, episodeTitle) {
    const episode = currentEpisodes.find(e => e.id === episodeId);
    if (!episode) {
        showCacheStatus('Episode not found', 'danger');
        return;
    }
    
    const episodeUrl = `${auth.base_url}/series/${auth.username}/${auth.password}/${episodeId}.${episode.container_extension || 'mp4'}`;
    
    // Show video container
    const videoContainer = document.getElementById('video-container');
    const videoPlayer = document.getElementById('video-player');
    const nowPlayingTitle = document.getElementById('now-playing-title');
    const trailerContainer = document.getElementById('trailer-container');
    
    // Hide trailer if showing
    trailerContainer.style.display = 'none';
    
    // Update title
    nowPlayingTitle.textContent = `Episode ${episodeNum}: ${episodeTitle}`;
    
    // Set video source and show player
    videoPlayer.src = episodeUrl;
    videoContainer.style.display = 'block';
    
    // Set up event listeners for better user feedback
    const onLoadStart = () => {
        showCacheStatus(`Loading Episode ${episodeNum} - ${episodeTitle}...`, 'info');
    };
    
    const onCanPlay = () => {
        // Try to play automatically
        videoPlayer.play().then(() => {
            showCacheStatus(`Playing Episode ${episodeNum} - ${episodeTitle}`, 'success');
        }).catch(error => {
            console.log('Autoplay prevented by browser:', error);
            showCacheStatus(`Episode ${episodeNum} loaded - Click play to start`, 'info');
        });
        
        // Remove event listeners
        videoPlayer.removeEventListener('loadstart', onLoadStart);
        videoPlayer.removeEventListener('canplay', onCanPlay);
        videoPlayer.removeEventListener('error', onError);
    };
    
    const onError = () => {
        showCacheStatus(`Error loading Episode ${episodeNum}`, 'danger');
        videoPlayer.removeEventListener('loadstart', onLoadStart);
        videoPlayer.removeEventListener('canplay', onCanPlay);
        videoPlayer.removeEventListener('error', onError);
    };
    
    // Add event listeners
    videoPlayer.addEventListener('loadstart', onLoadStart);
    videoPlayer.addEventListener('canplay', onCanPlay);
    videoPlayer.addEventListener('error', onError);
    
    // Update technical details with episode URL
    document.getElementById('series-url').value = episodeUrl;
    
    // Scroll to video player
    videoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Stop episode playback
function stopEpisodePlayback() {
    const videoContainer = document.getElementById('video-container');
    const videoPlayer = document.getElementById('video-player');
    
    // Pause and clear video
    videoPlayer.pause();
    videoPlayer.src = '';
    
    // Hide video container
    videoContainer.style.display = 'none';
    
    // Clear technical details URL
    document.getElementById('series-url').value = '';
    
    showCacheStatus('Playback stopped', 'info');
}

// Copy episode URL to clipboard
function copyEpisodeUrl(episodeId, containerExtension) {
    const episodeUrl = `${auth.base_url}/series/${auth.username}/${auth.password}/${episodeId}.${containerExtension || 'mp4'}`;
    
    navigator.clipboard.writeText(episodeUrl).then(() => {
        const button = event.target.closest('button');
        const originalContent = button.innerHTML;
        
        button.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
        button.classList.replace('btn-outline-secondary', 'btn-success');
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.classList.replace('btn-success', 'btn-outline-secondary');
        }, 2000);
        
        showCacheStatus('Episode URL copied to clipboard', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const tempInput = document.createElement('input');
        document.body.appendChild(tempInput);
        tempInput.value = episodeUrl;
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        const button = event.target.closest('button');
        const originalContent = button.innerHTML;
        
        button.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
        button.classList.replace('btn-outline-secondary', 'btn-success');
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.classList.replace('btn-success', 'btn-outline-secondary');
        }, 2000);
        
        showCacheStatus('Episode URL copied to clipboard', 'success');
    });
}

// Download episode
function downloadEpisode(episodeId, containerExtension, episodeTitle) {
    const episodeUrl = `${auth.base_url}/series/${auth.username}/${auth.password}/${episodeId}.${containerExtension || 'mp4'}`;
    const filename = `${sanitizeFilename(episodeTitle)}.${containerExtension || 'mp4'}`;
    
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = episodeUrl;
    link.download = filename;
    link.style.display = 'none';
    
    // Add link to document, click it, then remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showCacheStatus(`Starting download: ${filename}`, 'success');
}

// Sanitize filename for download
function sanitizeFilename(filename) {
    // Remove invalid characters for filenames
    return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}

// Handle sort change
function handleSortChange() {
    const sortSelector = document.getElementById('sort-selector');
    currentSort = sortSelector.value;
    
    // Apply sorting to current filtered series
    filteredSeries = sortItems([...filteredSeries], currentSort);
    currentPage = 1; // Reset to first page after sort
    
    // Re-render with new sort
    updateResultsDisplay();
}

// Create debounced search function for better performance
const debouncedSearchSeries = debounce(performSearch, 300);

// Handle search keypress
function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        performSearch();
    } else {
        // Use debounced search for real-time typing
        debouncedSearchSeries();
    }
}

// Perform search with pagination reset
function performSearch() {
    if (isLoading) return;
    
    const searchInput = document.getElementById('series-search');
    const clearBtn = document.getElementById('clear-search-btn');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Show/hide clear button
    clearBtn.style.display = searchTerm ? 'block' : 'none';
    
    // Filter series
    const filtered = searchItems(allSeries, searchTerm);
    
    // Apply current sorting to filtered results
    filteredSeries = sortItems(filtered, currentSort);
    
    // Reset to first page after search
    currentPage = 1;
    
    // Update display
    updateResultsDisplay();
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('series-search');
    const clearBtn = document.getElementById('clear-search-btn');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    // Reset to show all series
    performSearch();
    
    // Focus back on search input
    searchInput.focus();
}

// Copy series URL
function copySeriesUrl() {
    if (window.currentSeriesUrl) {
        copyToClipboard(window.currentSeriesUrl).then(() => {
            const button = event.target.closest('button');
            showButtonFeedback(button);
        });
    }
}

// Copy series URL from technical section
function copySeriesUrlTechnical() {
    const seriesUrl = document.getElementById('series-url');
    seriesUrl.select();
    document.execCommand('copy');
    
    const button = event.target.closest('button');
    showButtonFeedback(button);
}

// Toggle trailer
function toggleTrailer() {
    if (window.currentTrailer) {
        const trailerContainer = document.getElementById('trailer-container');
        const youtubeTrailer = document.getElementById('youtube-trailer');
        const trailerBtn = document.getElementById('trailer-btn');
        
        if (trailerContainer.style.display === 'none' || trailerContainer.style.display === '') {
            // Show trailer
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

// Utility functions
function formatRating(rating) {
    if (!rating) return 'N/A';
    return parseFloat(rating).toFixed(1);
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return 'Unknown';
    }
}

function searchItems(items, searchTerm) {
    if (!searchTerm) return items;
    
    return items.filter(item => {
        const title = (item.title || item.name || '').toLowerCase();
        const plot = (item.plot || '').toLowerCase();
        const cast = (item.cast || '').toLowerCase();
        const director = (item.director || '').toLowerCase();
        const genre = (item.genre || '').toLowerCase();
        const year = (item.year || '').toString();
        
        return title.includes(searchTerm) ||
               plot.includes(searchTerm) ||
               cast.includes(searchTerm) ||
               director.includes(searchTerm) ||
               genre.includes(searchTerm) ||
               year.includes(searchTerm);
    });
}

function sortItems(items, sortCriteria) {
    const [field, direction] = sortCriteria.split('-');
    
    return items.sort((a, b) => {
        let valueA, valueB;
        
        switch(field) {
            case 'title':
                valueA = (a.title || a.name || '').toLowerCase();
                valueB = (b.title || b.name || '').toLowerCase();
                break;
            case 'rating':
                valueA = parseFloat(a.rating) || 0;
                valueB = parseFloat(b.rating) || 0;
                break;
            case 'year':
                valueA = parseInt(a.year) || 0;
                valueB = parseInt(b.year) || 0;
                break;
            case 'added':
                valueA = parseInt(a.added) || parseInt(a.last_modified) || 0;
                valueB = parseInt(b.added) || parseInt(b.last_modified) || 0;
                break;
            default:
                return 0;
        }
        
        let comparison = 0;
        if (typeof valueA === 'string') {
            comparison = valueA.localeCompare(valueB);
        } else {
            comparison = valueA - valueB;
        }
        
        return direction === 'desc' ? -comparison : comparison;
    });
}

// Navigation functions
function showCategories() {
    hideAllViews();
    loadCategories();
}

function goBackToSeries() {
    if (currentCategory) {
        if (currentCategory.id === null) {
            loadAllSeries();
        } else {
            loadSeries(currentCategory.id, currentCategory.name);
        }
    } else {
        showCategories();
    }
}

function hideAllViews() {
    document.getElementById('categories-view').style.display = 'none';
    document.getElementById('series-view').style.display = 'none';
    document.getElementById('series-details').style.display = 'none';
    document.getElementById('breadcrumb').style.display = 'none';
}
