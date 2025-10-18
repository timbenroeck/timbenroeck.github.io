// Common JavaScript functions shared across all pages

// Global variables
let auth = null;

// Authentication functions
function checkAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const authParam = urlParams.get('auth');
    
    if (!authParam) {
        // Redirect to login page
        window.location.href = 'login.html';
        return false;
    }

    try {
        // Decode base64 auth parameter
        const decodedAuth = atob(authParam);
        const authData = JSON.parse(decodedAuth);
        
        if (!authData.username || !authData.password || !authData.base_url) {
            throw new Error('Invalid auth data');
        }
        
        auth = authData;
        console.log('Authentication successful');
        return true;
    } catch (error) {
        console.error('Auth decode error:', error);
        window.location.href = 'login.html';
        return false;
    }
}

function logout() {
    window.location.href = 'login.html';
}

// Loading functions
function showLoading(show = true, message = 'Loading...') {
    const loadingElement = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
    
    if (loadingText) {
        loadingText.textContent = message;
    }
}

// Cache status feedback
function showCacheStatus(message, type = 'info') {
    // Output to console instead of showing toast notifications
    const prefix = `[CACHE ${type.toUpperCase()}]`;
    
    switch (type) {
        case 'success':
            console.log(prefix, message);
            break;
        case 'info':
            console.info(prefix, message);
            break;
        case 'warning':
            console.warn(prefix, message);
            break;
        case 'danger':
        case 'error':
            console.error(prefix, message);
            break;
        default:
            console.log(prefix, message);
    }
}

// Cache management
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const CACHE_PREFIX = 'iptv_cache_';

function getCacheKey(action, params = {}) {
    const sortedParams = Object.keys(params).sort().reduce((result, key) => {
        result[key] = params[key];
        return result;
    }, {});
    
    return CACHE_PREFIX + btoa(JSON.stringify({
        base_url: auth?.base_url,
        username: auth?.username,
        action,
        params: sortedParams
    }));
}

function getFromCache(cacheKey) {
    try {
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp > CACHE_DURATION) {
            localStorage.removeItem(cacheKey);
            return null;
        }
        
        return data;
    } catch (error) {
        console.warn('Cache read error:', error);
        return null;
    }
}

function setCache(cacheKey, data) {
    try {
        const cacheData = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
        console.warn('Cache write error:', error);
        // If localStorage is full, clear old cache entries
        clearOldCache();
    }
}

function clearOldCache() {
    try {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
        const now = Date.now();
        
        cacheKeys.forEach(key => {
            try {
                const cached = localStorage.getItem(key);
                if (cached) {
                    const { timestamp } = JSON.parse(cached);
                    if (now - timestamp > CACHE_DURATION) {
                        localStorage.removeItem(key);
                    }
                }
            } catch (e) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.warn('Cache cleanup error:', error);
    }
}

function clearAllCache() {
    try {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
        cacheKeys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.warn('Clear all cache error:', error);
    }
}

// API functions with caching
async function fetchAPI(action, params = {}, useCache = true) {
    if (!auth) {
        throw new Error('Not authenticated');
    }
    
    const cacheKey = getCacheKey(action, params);
    
    // Try to get from cache first
    if (useCache) {
        const cachedData = getFromCache(cacheKey);
        if (cachedData) {
            console.log(`Cache hit for ${action}`);
            showCacheStatus(`Loaded ${action} from cache (faster loading)`, 'success');
            return cachedData;
        }
    }
    
    console.log(`API call for ${action}`);
    
    const url = new URL(`${auth.base_url}/player_api.php`);
    url.searchParams.set('username', auth.username);
    url.searchParams.set('password', auth.password);
    url.searchParams.set('action', action);
    
    // Add additional parameters
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
            url.searchParams.set(key, params[key]);
        }
    });
    
    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    if (useCache) {
        setCache(cacheKey, data);
    }
    
    return data;
}

// Stream URL generation
function generateStreamUrl(stream, type) {
    if (!auth) return '';
    
    switch(type) {
        case 'live':
            return `${auth.base_url}/live/${auth.username}/${auth.password}/${stream.stream_id}.m3u8`;
        case 'vod':
            return `${auth.base_url}/movie/${auth.username}/${auth.password}/${stream.stream_id}.${stream.container_extension || 'mp4'}`;
        case 'series':
            return `${auth.base_url}/series/${auth.username}/${auth.password}/${stream.series_id}.m3u8`;
        default:
            return '';
    }
}

// Utility functions
function formatRuntime(minutes) {
    if (!minutes || minutes === 0) return 'Runtime Unknown';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    } else {
        return `${mins}m`;
    }
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

function formatRating(rating) {
    if (!rating) return 'N/A';
    return parseFloat(rating).toFixed(1);
}

// Sorting functions
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
                valueA = parseInt(a.added || a.last_modified) || 0;
                valueB = parseInt(b.added || b.last_modified) || 0;
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

// Search functions
function searchItems(items, searchTerm) {
    if (!searchTerm) return items;
    
    const term = searchTerm.toLowerCase().trim();
    
    return items.filter(item => {
        const title = (item.title || item.name || '').toLowerCase();
        const plot = (item.plot || '').toLowerCase();
        const cast = (item.cast || '').toLowerCase();
        const director = (item.director || '').toLowerCase();
        const genre = (item.genre || '').toLowerCase();
        const year = (item.year || '').toString();
        
        return title.includes(term) ||
               plot.includes(term) ||
               cast.includes(term) ||
               director.includes(term) ||
               genre.includes(term) ||
               year.includes(term);
    });
}

// Copy to clipboard function
function copyToClipboard(text) {
    return navigator.clipboard.writeText(text).then(() => {
        return true;
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
    });
}

// Show feedback on button
function showButtonFeedback(button, successText = 'Copied!', duration = 2000) {
    const originalText = button.innerHTML;
    const originalClasses = button.className;
    
    button.innerHTML = `<i class="fas fa-check me-1"></i>${successText}`;
    button.className = button.className.replace('btn-outline-secondary', 'btn-success');
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.className = originalClasses;
    }, duration);
}

// Navigation helper
function goHome() {
    // Get current auth parameter and redirect to main page
    const urlParams = new URLSearchParams(window.location.search);
    const authParam = urlParams.get('auth');
    
    if (authParam) {
        window.location.href = `index.html?auth=${authParam}`;
    } else {
        window.location.href = 'login.html';
    }
}

// Pagination utilities
function paginateArray(array, page = 1, itemsPerPage = 50) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return {
        data: array.slice(startIndex, endIndex),
        currentPage: page,
        totalPages: Math.ceil(array.length / itemsPerPage),
        totalItems: array.length,
        itemsPerPage,
        hasNextPage: endIndex < array.length,
        hasPrevPage: page > 1,
        startIndex: startIndex + 1,
        endIndex: Math.min(endIndex, array.length)
    };
}

function createPaginationControls(paginationInfo, onPageChange) {
    if (paginationInfo.totalPages <= 1) {
        return '';
    }
    
    const { currentPage, totalPages, hasPrevPage, hasNextPage } = paginationInfo;
    
    let pagination = '<nav aria-label="Page navigation"><ul class="pagination justify-content-center">';
    
    // Previous button
    pagination += `<li class="page-item ${!hasPrevPage ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="event.preventDefault(); ${hasPrevPage ? `${onPageChange}(${currentPage - 1})` : ''}" aria-label="Previous">
            <span aria-hidden="true">&laquo;</span>
        </a>
    </li>`;
    
    // Page numbers (show max 5 pages around current page)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        pagination += `<li class="page-item"><a class="page-link" href="#" onclick="event.preventDefault(); ${onPageChange}(1)">1</a></li>`;
        if (startPage > 2) {
            pagination += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        pagination += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="event.preventDefault(); ${onPageChange}(${i})">${i}</a>
        </li>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagination += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        pagination += `<li class="page-item"><a class="page-link" href="#" onclick="event.preventDefault(); ${onPageChange}(${totalPages})">${totalPages}</a></li>`;
    }
    
    // Next button
    pagination += `<li class="page-item ${!hasNextPage ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="event.preventDefault(); ${hasNextPage ? `${onPageChange}(${currentPage + 1})` : ''}" aria-label="Next">
            <span aria-hidden="true">&raquo;</span>
        </a>
    </li></ul></nav>`;
    
    return pagination;
}

// Performance utilities
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Virtual scrolling helper (for very large datasets)
function createVirtualList(container, items, renderItem, itemHeight = 100) {
    const containerHeight = container.clientHeight;
    const visibleItems = Math.ceil(containerHeight / itemHeight) + 2; // Buffer
    let scrollTop = 0;
    
    const virtualList = {
        render: function() {
            const startIndex = Math.floor(scrollTop / itemHeight);
            const endIndex = Math.min(startIndex + visibleItems, items.length);
            
            const visibleData = items.slice(startIndex, endIndex);
            
            container.innerHTML = `
                <div style="height: ${startIndex * itemHeight}px;"></div>
                ${visibleData.map((item, index) => renderItem(item, startIndex + index)).join('')}
                <div style="height: ${(items.length - endIndex) * itemHeight}px;"></div>
            `;
        },
        
        onScroll: function(event) {
            scrollTop = event.target.scrollTop;
            this.render();
        }
    };
    
    return virtualList;
}

// URL State Management
function saveStateToURL(state) {
    const stateString = btoa(JSON.stringify(state));
    window.location.hash = stateString;
}

function getStateFromURL() {
    try {
        if (window.location.hash) {
            const hashWithoutPound = window.location.hash.substring(1);
            return JSON.parse(atob(hashWithoutPound));
        }
    } catch (error) {
        console.log('Error parsing URL state:', error);
    }
    return null;
}

function clearURLState() {
    window.location.hash = '';
}

// Initialize page
function initializePage() {
    // Clear old cache on startup
    clearOldCache();
    return checkAuth();
}
