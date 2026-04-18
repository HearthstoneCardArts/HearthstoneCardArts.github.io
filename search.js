let cardsData = null;

async function fetchCardsData() {
  try {
    const response = await fetch('https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json');
    cardsData = await response.json();
  } catch (error) {
    console.error('Error fetching:', error);
    showErrorMessage('Failed to load database. Try again later.');
  }
}

function normalizeString(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findCardArt(cardName) {
  if (!cardsData) return null;
  
  const normalizedInput = normalizeString(cardName);
  
  for (const card of cardsData) {
    const cardNameStr = card.name || '';
    if (normalizedInput === normalizeString(cardNameStr)) {
      const cardId = card.id;
      if (cardId) {
        return {
          artUrl: `https://art.hearthstonejson.com/v1/512x/${cardId}.jpg`,
          actualName: cardNameStr,
          exactMatch: true
        };
      }
    }
  }
  return null;
}

function findSimilarCards(cardName) {
  if (!cardsData) return [];
  
  const normalizedInput = normalizeString(cardName);
  const matches = [];
  
  for (const card of cardsData) {
    const cardNameStr = card.name || '';
    const normalizedCard = normalizeString(cardNameStr);
    
    if (normalizedCard.includes(normalizedInput) || normalizedInput.includes(normalizedCard)) {
      matches.push(cardNameStr);
    }
  }
  
  return matches.slice(0, 5);
}

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

function showArt(cardName, artData) {
  hideErrorMessage();
  document.getElementById('artImage').src = artData.artUrl;
  document.getElementById('artName').textContent = `Card: ${artData.actualName}`;
  document.getElementById('artLink').href = artData.artUrl;
  document.getElementById('artResult').classList.add('show');
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

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('searchForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const cardName = document.getElementById('cardName').value;
    
    if (!cardName.trim()) {
      showErrorMessage('Enter a card name.');
      return;
    }

    showLoading();
    hideArt();
    hideErrorMessage();

    if (!cardsData) {
      await fetchCardsData();
    }

    setTimeout(() => {
      const result = findCardArt(cardName);
      
      if (result) {
        showArt(cardName, result);
      } else {
        const similarCards = findSimilarCards(cardName);
        
        if (similarCards.length > 0) {
          showErrorMessage(
            `"${cardName}" not found.`,
            similarCards
          );
        } else {
          showErrorMessage(`"${cardName}" doesn't exist.`);
        }
      }
      
      hideLoading();
    }, 200);
  });

  fetchCardsData();
});

function setRandomPlaceholder() {
  if (!cardsData || cardsData.length === 0) return;
  const randomCard = cardsData[Math.floor(Math.random() * cardsData.length)];
  const placeholder = `For example: ${randomCard.name}`;
  document.getElementById('cardName').placeholder = placeholder;
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('searchForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const cardName = document.getElementById('cardName').value;
    
    if (!cardName.trim()) {
      showErrorMessage('Please enter a card name.');
      return;
    }

    showLoading();
    hideArt();
    hideErrorMessage();
    if (!cardsData) {
      await fetchCardsData();
    }

    setTimeout(() => {
      const result = findCardArt(cardName);
      
      if (result) {
        showArt(cardName, result);
      } else {
        const similarCards = findSimilarCards(cardName);
        
        if (similarCards.length > 0) {
          showErrorMessage(`"${cardName}" not found.`, similarCards);
        } else {
          showErrorMessage(`"${cardName}" doesn't exist.`);
        }
      }
      
      hideLoading();
    }, 200);
  });

  fetchCardsData().then(() => {
    setRandomPlaceholder();
  });
});
setRandomPlaceholder();