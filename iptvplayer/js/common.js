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

// Cache management with IndexedDB
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const CACHE_PREFIX = 'iptv_cache_';
const DB_NAME = 'IPTVPlayerCache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

// IndexedDB Cache System
class IndexedDBCache {
    constructor() {
        this.db = null;
        this.fallbackToLocalStorage = false;
    }

    async init() {
        if (this.db) return this.db;
        
        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = () => {
                    console.warn('IndexedDB failed, falling back to localStorage');
                    this.fallbackToLocalStorage = true;
                    resolve(null);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        const store = db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
                        store.createIndex('expiry', 'expiry', { unique: false });
                        store.createIndex('action', 'action', { unique: false });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                };
                
                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    resolve(this.db);
                };
            });
        } catch (error) {
            console.warn('IndexedDB initialization failed:', error);
            this.fallbackToLocalStorage = true;
            return null;
        }
    }

    async getFromCache(cacheKey) {
        try {
            if (this.fallbackToLocalStorage) {
                return this.getFromLocalStorageCache(cacheKey);
            }

            await this.init();
            if (!this.db) {
                return this.getFromLocalStorageCache(cacheKey);
            }

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            
            return new Promise((resolve) => {
                const request = store.get(cacheKey);
                
                request.onerror = () => {
                    console.warn('IndexedDB read error, trying localStorage fallback');
                    resolve(this.getFromLocalStorageCache(cacheKey));
                };
                
                request.onsuccess = () => {
                    const result = request.result;
                    if (!result) {
                        resolve(null);
                        return;
                    }
                    
                    const now = Date.now();
                    if (now > result.expiry) {
                        // Auto-cleanup expired entry
                        this.deleteFromCache(cacheKey);
                        resolve(null);
                        return;
                    }
                    
                    resolve(result.data);
                };
            });
        } catch (error) {
            console.warn('Cache read error:', error);
            return this.getFromLocalStorageCache(cacheKey);
        }
    }

    async setCache(cacheKey, data, action) {
        try {
            if (this.fallbackToLocalStorage) {
                return this.setLocalStorageCache(cacheKey, data);
            }

            await this.init();
            if (!this.db) {
                return this.setLocalStorageCache(cacheKey, data);
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const cacheEntry = {
                cacheKey,
                data,
                action,
                timestamp: Date.now(),
                expiry: Date.now() + CACHE_DURATION
            };
            
            return new Promise((resolve) => {
                const request = store.put(cacheEntry);
                
                request.onerror = () => {
                    console.warn('IndexedDB write error, trying localStorage fallback');
                    this.setLocalStorageCache(cacheKey, data);
                    resolve();
                };
                
                request.onsuccess = () => {
                    resolve();
                };
            });
        } catch (error) {
            console.warn('Cache write error:', error);
            this.setLocalStorageCache(cacheKey, data);
        }
    }

    async deleteFromCache(cacheKey) {
        try {
            if (this.fallbackToLocalStorage) {
                localStorage.removeItem(cacheKey);
                return;
            }

            await this.init();
            if (!this.db) {
                localStorage.removeItem(cacheKey);
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.delete(cacheKey);
        } catch (error) {
            console.warn('Cache delete error:', error);
            localStorage.removeItem(cacheKey);
        }
    }

    async clearOldCache() {
        try {
            if (this.fallbackToLocalStorage) {
                return this.clearOldLocalStorageCache();
            }

            await this.init();
            if (!this.db) {
                return this.clearOldLocalStorageCache();
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('expiry');
            
            // Get all expired entries
            const now = Date.now();
            const range = IDBKeyRange.upperBound(now);
            
            return new Promise((resolve) => {
                const request = index.openCursor(range);
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                
                request.onerror = () => {
                    console.warn('IndexedDB cleanup failed, trying localStorage cleanup');
                    this.clearOldLocalStorageCache();
                    resolve();
                };
            });
        } catch (error) {
            console.warn('Cache cleanup error:', error);
            this.clearOldLocalStorageCache();
        }
    }

    async clearAllCache() {
        try {
            if (this.fallbackToLocalStorage) {
                return this.clearAllLocalStorageCache();
            }

            await this.init();
            if (!this.db) {
                return this.clearAllLocalStorageCache();
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            return new Promise((resolve) => {
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log('All IndexedDB cache cleared successfully');
                    resolve();
                };
                
                request.onerror = () => {
                    console.warn('IndexedDB clear failed, trying localStorage cleanup');
                    this.clearAllLocalStorageCache();
                    resolve();
                };
            });
        } catch (error) {
            console.warn('Clear all cache error:', error);
            this.clearAllLocalStorageCache();
        }
    }

    // LocalStorage fallback methods
    getFromLocalStorageCache(cacheKey) {
        try {
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;
            
            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            
            if (now - timestamp > CACHE_DURATION) {
                localStorage.removeItem(cacheKey);
                return null;
            }
            
            return data;
        } catch (error) {
            console.warn('LocalStorage cache read error:', error);
            return null;
        }
    }

    setLocalStorageCache(cacheKey, data) {
        try {
            const cacheData = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('LocalStorage cache write error:', error);
            this.clearOldLocalStorageCache();
        }
    }

    clearOldLocalStorageCache() {
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
            console.warn('LocalStorage cache cleanup error:', error);
        }
    }

    clearAllLocalStorageCache() {
        try {
            const keys = Object.keys(localStorage);
            const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
            cacheKeys.forEach(key => localStorage.removeItem(key));
        } catch (error) {
            console.warn('LocalStorage clear all cache error:', error);
        }
    }

    async getCacheStats() {
        try {
            if (this.fallbackToLocalStorage) {
                const keys = Object.keys(localStorage);
                const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
                return {
                    type: 'localStorage',
                    totalEntries: cacheKeys.length,
                    estimatedSize: JSON.stringify(localStorage).length
                };
            }

            await this.init();
            if (!this.db) {
                return { type: 'unavailable', totalEntries: 0, estimatedSize: 0 };
            }

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            
            return new Promise((resolve) => {
                const countRequest = store.count();
                countRequest.onsuccess = () => {
                    resolve({
                        type: 'IndexedDB',
                        totalEntries: countRequest.result,
                        estimatedSize: 'N/A (IndexedDB managed)'
                    });
                };
                countRequest.onerror = () => {
                    resolve({ type: 'error', totalEntries: 0, estimatedSize: 0 });
                };
            });
        } catch (error) {
            return { type: 'error', totalEntries: 0, estimatedSize: 0 };
        }
    }
}

// Create global cache instance
const cacheDB = new IndexedDBCache();

// Cache utility functions (maintain API compatibility)
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

// Async wrapper functions for backward compatibility
async function getFromCache(cacheKey) {
    return await cacheDB.getFromCache(cacheKey);
}

async function setCache(cacheKey, data, action = '') {
    return await cacheDB.setCache(cacheKey, data, action);
}

async function clearOldCache() {
    return await cacheDB.clearOldCache();
}

async function clearAllCache() {
    return await cacheDB.clearAllCache();
}

// API functions with caching
async function fetchAPI(action, params = {}, useCache = true) {
    if (!auth) {
        throw new Error('Not authenticated');
    }
    
    const cacheKey = getCacheKey(action, params);
    
    // Try to get from cache first
    if (useCache) {
        try {
            const cachedData = await getFromCache(cacheKey);
            if (cachedData) {
                console.log(`Cache hit for ${action}`);
                showCacheStatus(`Loaded ${action} from cache (faster loading)`, 'success');
                return cachedData;
            }
        } catch (error) {
            console.warn(`Cache read failed for ${action}, proceeding with API call:`, error);
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
        try {
            await setCache(cacheKey, data, action);
        } catch (error) {
            console.warn(`Cache write failed for ${action}:`, error);
        }
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

// HLS Video Player Functions
function createHLSPlayer(videoElement, streamUrl, onSuccess, onError) {
    // Check if HLS.js is supported
    if (Hls.isSupported()) {
        const hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });
        
        hls.loadSource(streamUrl);
        hls.attachMedia(videoElement);
        
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log('HLS manifest parsed successfully');
            if (onSuccess) onSuccess();
        });
        
        hls.on(Hls.Events.ERROR, function(event, data) {
            console.error('HLS error:', data);
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log('Network error, trying to recover...');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log('Media error, trying to recover...');
                        hls.recoverMediaError();
                        break;
                    default:
                        console.log('Fatal error, destroying HLS instance');
                        hls.destroy();
                        if (onError) onError('HLS playback failed: ' + data.reason);
                        break;
                }
            }
        });
        
        return hls;
    } 
    // Fallback for browsers with native HLS support (Safari)
    else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = streamUrl;
        console.log('Using native HLS support');
        if (onSuccess) onSuccess();
        return null; // No HLS.js instance needed
    }
    // No HLS support
    else {
        console.error('HLS not supported in this browser');
        if (onError) onError('HLS streams are not supported in this browser');
        return null;
    }
}

function setupVideoPlayer(videoElement, streamUrl, title = '') {
    return new Promise((resolve, reject) => {
        // Clear any existing source
        videoElement.src = '';
        if (videoElement.hlsInstance) {
            videoElement.hlsInstance.destroy();
            videoElement.hlsInstance = null;
        }
        
        const isHLS = streamUrl.includes('.m3u8');
        
        if (isHLS) {
            // Use HLS.js for .m3u8 files
            const onSuccess = () => {
                showCacheStatus(`${title} loaded successfully`, 'success');
                resolve();
            };
            
            const onError = (error) => {
                showCacheStatus(`Error loading ${title}: ${error}`, 'danger');
                reject(new Error(error));
            };
            
            videoElement.hlsInstance = createHLSPlayer(videoElement, streamUrl, onSuccess, onError);
        } else {
            // Use regular video for other formats
            videoElement.src = streamUrl;
            
            const onCanPlay = () => {
                showCacheStatus(`${title} loaded successfully`, 'success');
                videoElement.removeEventListener('canplay', onCanPlay);
                videoElement.removeEventListener('error', onVideoError);
                resolve();
            };
            
            const onVideoError = () => {
                showCacheStatus(`Error loading ${title}`, 'danger');
                videoElement.removeEventListener('canplay', onCanPlay);
                videoElement.removeEventListener('error', onVideoError);
                reject(new Error('Video load failed'));
            };
            
            videoElement.addEventListener('canplay', onCanPlay);
            videoElement.addEventListener('error', onVideoError);
        }
    });
}

function destroyVideoPlayer(videoElement) {
    if (videoElement) {
        videoElement.pause();
        videoElement.src = '';
        
        if (videoElement.hlsInstance) {
            videoElement.hlsInstance.destroy();
            videoElement.hlsInstance = null;
        }
    }
}

// Initialize page
function initializePage() {
    // Clear old cache on startup
    clearOldCache();
    return checkAuth();
}
