// === iTunes Music Search App ===
// Uses the public iTunes Search API:
// https://itunes.apple.com/search?term={term}&entity=song

// DOM elements
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const mediaTypeSelect = document.getElementById("media-type");
const resultsSection = document.getElementById("results-section");
const resultsGrid = document.getElementById("results-grid");
const statusEl = document.getElementById("status");
const clearButton = document.getElementById("clear-button");
const quoteTextEl = document.getElementById("quote-text");
const quoteAuthorEl = document.getElementById("quote-author");
const quoteImageEl = document.querySelector(".quote-image");
const genreValueEl = document.getElementById("genre-value");
const GENRE_OF_DAY_KEY = "genre-of-the-day";
const ITUNES_BASE_URL = "https://itunes.apple.com/search";

/**
 * Returns a YYYY-MM-DD string for "today" (local time).
 */
function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Restore last search term (optional stretch using localStorage)
const LAST_TERM_KEY = "itunes-last-search-term";

(function restoreLastSearch() {
  try {
    const saved = localStorage.getItem(LAST_TERM_KEY);
    if (saved) {
      searchInput.value = saved;
    }
  } catch (err) {
    // Local storage might be blocked; it's safe to ignore errors here.
  }
})();

// Listen for form submit
searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const rawTerm = searchInput.value.trim();
  const entity = mediaTypeSelect.value;

  if (!rawTerm) {
    setStatus("Please type something to search.", "error");
    return;
  }

  // Save search term to localStorage (stretch goal)
  try {
    localStorage.setItem(LAST_TERM_KEY, rawTerm);
  } catch (err) {
    // ignore localStorage errors
  }

  // Reset UI
  resultsGrid.innerHTML = "";
  hideResults();
  setStatus("Searching iTunes…", "loading");

  try {
    const url = `${ITUNES_BASE_URL}?term=${encodeURIComponent(
      rawTerm
    )}&entity=${encodeURIComponent(entity)}&limit=24`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      setStatus(
        "No results found. Try a different search term or media type.",
        "empty"
      );
      return;
    }

    setStatus(
      `Found ${data.resultCount} item(s). Showing up to ${data.results.length}.`,
      "success"
    );
    renderResults(data.results, entity);
  } catch (error) {
    console.error(error);
    setStatus(
      "Something went wrong while contacting the iTunes API. Please try again.",
      "error"
    );
  }
});

// Clear button to reset results
clearButton.addEventListener("click", () => {
  searchInput.focus();
  resultsGrid.innerHTML = "";
  hideResults();
  setStatus("Results cleared. Enter a new search term.", "info");
});

// === Helper functions ===

/**
 * Update the status area with a message and type.
 * type can be: "loading", "success", "error", "empty", "info"
 */
function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

/**
 * Hide results section
 */
function hideResults() {
  resultsSection.classList.add("hidden");
}

/**
 * Show results section
 */
function showResults() {
  resultsSection.classList.remove("hidden");
}

/**
 * Render result cards into the grid
 * @param {Array} items
 * @param {string} entity
 */
function renderResults(items, entity) {
  resultsGrid.innerHTML = "";

  items.forEach((item) => {
    const card = createResultCard(item, entity);
    resultsGrid.appendChild(card);
  });

  showResults();
}

// === Quote of the Day ===
// Fetch a random quote and set a background image in the header.
// This runs once on page load.

// === Quote of the Day ===
// Fetch a random quote and set a background image in the header.
// This runs once on page load.
async function loadQuoteOfTheDay() {
  if (!quoteTextEl || !quoteAuthorEl || !quoteImageEl) return;

  try {
    quoteTextEl.textContent = "Loading quote of the day…";
    quoteAuthorEl.textContent = "";

    // DummyJSON random quote endpoint
    const response = await fetch("https://dummyjson.com/quotes/random");
    if (!response.ok) {
      throw new Error(`Quote API error: ${response.status}`);
    }

    const data = await response.json();
    // data = { id, quote, author }
    const content = data.quote || "Keep going, keep growing.";
    const author = data.author || "Unknown";

    quoteTextEl.textContent = `“${content}”`;
    quoteAuthorEl.textContent = `— ${author}`;

    // Random scenic image for some inspiration
    const imageUrl =
      "https://source.unsplash.com/featured/400x240/?nature,landscape";
    quoteImageEl.style.backgroundImage = `url("${imageUrl}")`;
  } catch (error) {
    console.error(error);
    // Fallback text if API fails
    quoteTextEl.textContent = "“Music gives a soul to the universe.”";
    quoteAuthorEl.textContent = "— Plato";
    quoteImageEl.style.backgroundImage =
      'url("https://source.unsplash.com/featured/400x240/?music")';
  }
}

// === Music Genre of the Day ===
// Uses Binary Jazz Genrenator API: https://binaryjazz.us/wp-json/genrenator/v1/genre/
// Falls back to a local list if the API isn't reachable.
async function loadGenreOfTheDay() {
  if (!genreValueEl) return;

  const today = getTodayDateString();

  // 1) Try to use cached value for today
  try {
    const cached = localStorage.getItem(GENRE_OF_DAY_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.date === today && typeof parsed.genre === "string") {
        genreValueEl.textContent = parsed.genre;
        return;
      }
    }
  } catch (err) {
    // localStorage might be blocked - ignore and just fetch
  }

  // 2) If no valid cache, fetch from the Genrenator API
  genreValueEl.textContent = "Loading…";

  try {
    const response = await fetch(
      "https://binaryjazz.us/wp-json/genrenator/v1/genre/"
    );

    if (!response.ok) {
      throw new Error(`Genre API error: ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      // Some setups may return plain text
      const textData = await response.text();
      data = textData;
    }

    let genre = "";

    if (Array.isArray(data) && data.length > 0) {
      genre = data[0];
    } else if (data && typeof data === "object" && typeof data.genre === "string") {
      genre = data.genre;
    } else if (typeof data === "string") {
      genre = data;
    }

    if (!genre) {
      throw new Error("No genre returned from API");
    }

    genreValueEl.textContent = genre;

    // Store for today
    try {
      localStorage.setItem(
        GENRE_OF_DAY_KEY,
        JSON.stringify({ date: today, genre })
      );
    } catch (err) {
      // ignore localStorage issues
    }
  } catch (error) {
    console.error(error);

    // 3) Fallback list of genres if API fails (CORS/offline/etc.)
    const fallbackGenres = [
      "lo-fi chillhop",
      "cosmic synthwave",
      "coffeehouse jazz",
      "retro electro funk",
      "ambient dream pop",
      "future soul",
      "indie dance rock",
      "space disco",
      "cinematic orchestra",
      "psychedelic surf"
    ];
    const randomGenre =
      fallbackGenres[Math.floor(Math.random() * fallbackGenres.length)];

    genreValueEl.textContent = randomGenre;

    try {
      localStorage.setItem(
        GENRE_OF_DAY_KEY,
        JSON.stringify({ date: today, genre: randomGenre })
      );
    } catch (err) {
      // ignore
    }
  }
}


/**
 * Create a result card element for a single item
 * @param {Object} item
 * @param {string} entity
 * @returns {HTMLElement}
 */
function createResultCard(item, entity) {
  const title = item.trackName || item.collectionName || "Untitled";
  const artist = item.artistName || "Unknown artist";
  const album =
    item.collectionName && item.collectionName !== item.trackName
      ? item.collectionName
      : "";
  const artwork =
    (item.artworkUrl100 &&
      item.artworkUrl100.replace("100x100bb", "300x300bb")) ||
    item.artworkUrl100 ||
    "";
  const previewUrl = item.previewUrl;
  const viewUrl = item.trackViewUrl || item.collectionViewUrl || "";
  const releaseYear = item.releaseDate
    ? new Date(item.releaseDate).getFullYear()
    : "";

  const card = document.createElement("article");
  card.className = "result-card";

  const header = document.createElement("div");
  header.className = "result-card-header";

  const img = document.createElement("img");
  img.src = artwork || "https://via.placeholder.com/100?text=Music";
  img.alt = album
    ? `Artwork for ${album} by ${artist}`
    : `Artwork for ${title} by ${artist}`;

  const textWrapper = document.createElement("div");
  textWrapper.className = "result-text";

  const titleEl = document.createElement("h3");
  titleEl.className = "track-name";
  titleEl.textContent = title;

  const artistEl = document.createElement("p");
  artistEl.className = "artist-name";
  artistEl.textContent = artist;

  textWrapper.appendChild(titleEl);
  textWrapper.appendChild(artistEl);

  if (album) {
    const albumEl = document.createElement("p");
    albumEl.className = "album-name";
    albumEl.textContent = album;
    textWrapper.appendChild(albumEl);
  }

  header.appendChild(img);
  header.appendChild(textWrapper);

  const meta = document.createElement("p");
  meta.className = "result-meta";
  const pieces = [];
  if (entity === "song") pieces.push("Song");
  if (entity === "album") pieces.push("Album");
  if (entity === "musicVideo") pieces.push("Music Video");
  if (releaseYear) pieces.push(`Released ${releaseYear}`);
  meta.textContent = pieces.join(" • ");

  card.appendChild(header);
  card.appendChild(meta);

  // Only add audio previews when available
  if (previewUrl && (entity === "song" || entity === "musicVideo")) {
    const audioWrapper = document.createElement("div");
    audioWrapper.className = "audio-wrapper";

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = previewUrl;

    audioWrapper.appendChild(audio);
    card.appendChild(audioWrapper);
  }

  if (viewUrl) {
    const link = document.createElement("a");
    link.href = viewUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "result-link";
    link.textContent = "View on iTunes";
    card.appendChild(link);
  }

  return card;
}

// Run on initial page load
loadQuoteOfTheDay();
loadGenreOfTheDay();
