let cardsByLocale = {};
let currentLocale = 'enUS';
let currentSearch = '';

// locales with flags
const localeOptions = {
  deDE: { flag: '🇩🇪' },
  enUS: { flag: '🇺🇸' },
  esES: { flag: '🇪🇸' },
  esMX: { flag: '🇲🇽' },
  frFR: { flag: '🇫🇷' },
  itIT: { flag: '🇮🇹' },
  jaJP: { flag: '🇯🇵' },
  koKR: { flag: '🇰🇷' },
  plPL: { flag: '🇵🇱' },
  ptBR: { flag: '🇧🇷' },
  ruRU: { flag: '🇷🇺' },
  zhCN: { flag: '🇨🇳' },
  zhTW: { flag: '🇹🇼' }
};
const supportedLocales = Object.keys(localeOptions);

const localePlaceholder = {
  enUS: 'For example',
  deDE: 'Zum Beispiel',
  frFR: 'Par exemple',
  esES: 'Por ejemplo',
  esMX: 'Por ejemplo',
  itIT: 'Per esempio',
  ptBR: 'Por exemplo',
  ruRU: 'Например',
  zhCN: '例如',
  zhTW: '例如',
  jaJP: '例',
  koKR: '예를 들어',
  plPL: 'Na przykład'
};

const rarityMap = {
  '1': 'common',
  '2': 'common',
  '3': 'rare',
  '4': 'epic',
  '5': 'legendary',
  'FREE': 'free',
  'COMMON': 'common',
  'RARE': 'rare',
  'EPIC': 'epic',
  'LEGENDARY': 'legendary'
};

// remove accents, special chars, lowercase
function normalizeString(str) {
  return (str || '')
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function getRarityClass(rarity) {
  if (!rarity) return 'common';
  const rarityLower = String(rarity).toUpperCase();
  return rarityMap[rarityLower] || rarityMap[rarity] || 'common';
}

function updateQueryParams(q, locale) {
  const url = new URL(window.location.href);
  if (q) url.searchParams.set('q', q);
  else url.searchParams.delete('q');
  if (locale) url.searchParams.set('locale', locale);
  else url.searchParams.delete('locale');
  window.history.replaceState({}, '', url);
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

async function fetchCardsData(locale = 'enUS') {
  try {
    const response = await fetch((`locales/${locale}/cards.collectible.json`));
    // if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    cardsByLocale[locale] = data;
    return data;
  } 
  catch (error) {
    console.error(`Error fetching ${locale}:`, error);
    cardsByLocale[locale] = [];
    return [];
  }
}

async function fetchAllCardsData() {
  await Promise.all(supportedLocales.map(locale => fetchCardsData(locale)));
}

// random card name as placeholder
function setRandomPlaceholder() {
  const cards = cardsByLocale[currentLocale] || [];
  const input = document.getElementById('cardName');
  if (!input) return;
  if (!cards.length) {return;}

  const randomCard = cards[Math.floor(Math.random() * cards.length)];
  const label = localePlaceholder[currentLocale] || 'For example';
  input.placeholder = `${label}: ${randomCard.name}`;
}

// locale dropdown menu
function buildLocaleDropdown() {
  const dropdown = document.getElementById('localeDropdown');
  if (!dropdown) return;

  dropdown.innerHTML = '';

  Object.entries(localeOptions).forEach(([code, info]) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'locale-item';
    item.textContent = info.flag;
    item.title = code;
    item.addEventListener('click', () => {
      currentLocale = code;
      const flag = document.getElementById('localeFlag');
      if (flag) flag.textContent = info.flag;
      dropdown.classList.remove('show');
      const input = document.getElementById('cardName');
      input.value = ''; // clear search field when new locale is set
      document.getElementById('cardSuggestions').innerHTML = '';
      setRandomPlaceholder();
      // Update URL with new locale
      updateQueryParams('', currentLocale);
      // Clear results
      hideArt();
      hideErrorMessage();
    });
    dropdown.appendChild(item);
  });
}

function toggleLocaleDropdown() {
  const dropdown = document.getElementById('localeDropdown');
  if (dropdown) dropdown.classList.toggle('show');
}
function closeLocaleDropdown() {
  const dropdown = document.getElementById('localeDropdown');
  if (dropdown) dropdown.classList.remove('show');
}

// art by exact name match
function findCardArt(cardName, locale = currentLocale) {
  const cardsData = cardsByLocale[locale] || [];
  const normalizedInput = normalizeString(cardName);
  const matches = [];

  for (const card of cardsData) {
    const cardNameStr = card.name || '';
    if (normalizeString(cardNameStr) === normalizedInput) {
      // art type prefix like EX1 etc.
      const artType = card.id.split('_').slice(0, -1).join('_') || 'Unknown set';
      // get artist name from card data, fallback to 'Unknown artist' if not available
      const artist = card.artist || 'Unknown artist';
      // get rarity
      const rarity = getRarityClass(card.rarity);
      // get rarity display name
      const rarityDisplay = rarity.charAt(0).toUpperCase() + rarity.slice(1);
      matches.push({
        previewUrl: `https://art.hearthstonejson.com/v1/512x/${card.id}.jpg`,  // search shows 512x resolution card
        fullUrl: `https://art.hearthstonejson.com/v1/orig/${card.id}.png`, // Open in new tab opens original resolution
        actualName: cardNameStr,
        artType: artType,
        artist: artist,
        rarity: rarity,
        rarityDisplay: rarityDisplay,
        locale: locale
      });
    }
  }
  return matches;
}

// suggestions
function findSimilarCards(cardName, locale = currentLocale) {
  const cardsData = cardsByLocale[locale] || [];
  const normalizedInput = normalizeString(cardName);
  const matches = [];

  for (const card of cardsData) {
    const cardNameStr = card.name || '';
    const normalizedCard = normalizeString(cardNameStr);
    if (normalizedCard.includes(normalizedInput) || normalizedInput.includes(normalizedCard)) {
      matches.push(cardNameStr);
      if (matches.length >= 5) break;
    }
  }

  return [...new Set(matches)];  // set to remove duplicates
}

// suggestions as user types
function suggestionMaker(query) {
  const datalist = document.getElementById('cardSuggestions');
  datalist.innerHTML = '';
  if (!query.trim()) return;

  const cardsData = cardsByLocale[currentLocale] || [];
  const normalizedInput = normalizeString(query);
  const seen = new Set();
  const matches = [];

  for (const card of cardsData) {
    const name = card.name || '';
    if (normalizeString(name).includes(normalizedInput) && !seen.has(name)) {
      seen.add(name);
      matches.push(name);
      if (matches.length >= 8) break;
    }
  }

  matches.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    datalist.appendChild(option);
  });
}

// error message with suggestions
function showErrorMessage(message, similarCards = []) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.innerHTML = message;
  errorDiv.style.display = 'block';

  if (similarCards.length > 0) {
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'suggestions-list';
    suggestionsDiv.innerHTML = '<div style="margin-top: 10px; font-weight: 600;">Perhaps you meant:</div>';

    similarCards.forEach(cardName => {
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'suggestion-link';
      link.textContent = cardName;
      link.onclick = function(e) {
        e.preventDefault();
        const input = document.getElementById('cardName');
        input.value = cardName;
        input.focus();
        document.getElementById('searchForm').dispatchEvent(new Event('submit'));
      };
      suggestionsDiv.appendChild(link);
    });

    errorDiv.appendChild(suggestionsDiv);
  }

  document.getElementById('artResult').classList.remove('show');
}

function hideErrorMessage() {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.innerHTML = '';
  errorDiv.style.display = 'none';
}

// displays card art
function showArt(artDataArray) {
  hideErrorMessage();
  const artResult = document.getElementById('artResult');
  artResult.innerHTML = '';
  artResult.classList.add('show');

  artDataArray.forEach(data => {
    const wrapper = document.createElement('div');
    wrapper.className = `art-wrapper rarity-${data.rarity}`;
    wrapper.innerHTML = `
      <img src="${data.previewUrl}" alt="Card Art" class="art-image">
      <div class="art-name">${data.actualName}</div>
      <div class="art-type">${data.artType}</div>
      <div class="art-artist">${data.artist}</div>
      <div class="art-rarity rarity-${data.rarity}">${data.rarityDisplay}</div>
      <a href="${data.fullUrl}" target="_blank" rel="noopener noreferrer" class="art-link">Open in new tab</a>
    `;
    artResult.appendChild(wrapper);
  });
}
function hideArt() {
  document.getElementById('artResult').classList.remove('show');
}

function showLoading() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('searchBtn').disabled = true;
}
function hideLoading() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('searchBtn').disabled = false;
}

// initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  buildLocaleDropdown();
  const input = document.getElementById('cardName');
  const form = document.getElementById('searchForm');
  const localeButton = document.getElementById('localeButton');

  const initialQ = getQueryParam('q');
  const initialLocale = getQueryParam('locale');
  
  // Set locale from URL if present and valid
  if (initialLocale && supportedLocales.includes(initialLocale)) {
    currentLocale = initialLocale;
    const flag = document.getElementById('localeFlag');
    if (flag && localeOptions[initialLocale]) {
      flag.textContent = localeOptions[initialLocale].flag;
    }
  }
  
  if (initialQ) {
    currentSearch = initialQ;
    input.value = initialQ;
  }

  // toggle locale dropdown on button click
  if (localeButton) {
    localeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleLocaleDropdown();
    });
  }

  // close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const picker = document.querySelector('.locale-picker');
    if (picker && !picker.contains(e.target)) closeLocaleDropdown();
  });

  // make suggestions on input
  input.addEventListener('input', (e) => {
    suggestionMaker(e.target.value);
    currentSearch = e.target.value.trim();
    updateQueryParams(currentSearch, currentLocale);
  });

  // submit on change (datalist selection)
  input.addEventListener('change', () => {
    if (!input.value.trim()) return;
    form.requestSubmit();
    setTimeout(() => {
      document.getElementById('cardSuggestions').innerHTML = '';
    }, 0);
  });

  // form submission handling stuff
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const cardName = input.value.trim();

    if (!cardName) {
      showErrorMessage('Please enter a card name.');
      return;
    }

    currentSearch = cardName;
    updateQueryParams(cardName, currentLocale);

    showLoading();
    hideArt();
    hideErrorMessage();

    if (!Object.keys(cardsByLocale).length) {
      await fetchAllCardsData();
      setRandomPlaceholder();
    }

    setTimeout(() => {
      const results = findCardArt(cardName, currentLocale);

      if (results.length > 0) {
        showArt(results);
      } 
      else {
        const similarCards = findSimilarCards(cardName, currentLocale);
        if (similarCards.length > 0) {showErrorMessage(`"${cardName}" not found.`, similarCards);}
        else {showErrorMessage(`"${cardName}" doesn't exist.`);}
      }

      hideLoading();
    }, 200);
  });

  // initial data load + set placeholder
  await fetchAllCardsData();
  setRandomPlaceholder();

  if (initialQ) {
    form.requestSubmit();
  }
});
