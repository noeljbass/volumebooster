const DEFAULT_BOOST = 100;
const MIN_BOOST = 0;
const MAX_BOOST = 600;

const slider = document.querySelector('#boostSlider');
const boostValue = document.querySelector('#boostValue');
const boostLabel = document.querySelector('#boostLabel');
const statusText = document.querySelector('#status');
const presetButtons = document.querySelectorAll('.preset');

let activeTabId;
let debounceTimer;

function clampBoost(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_BOOST;
  }

  return Math.min(MAX_BOOST, Math.max(MIN_BOOST, Math.round(numericValue)));
}

function describeBoost(boost) {
  if (boost === 0) {
    return 'Muted';
  }

  if (boost === DEFAULT_BOOST) {
    return 'Normal volume';
  }

  if (boost > DEFAULT_BOOST) {
    return `${(boost / 100).toFixed(boost % 100 === 0 ? 0 : 1)}× boost`;
  }

  return 'Reduced volume';
}

function renderBoost(boost) {
  slider.value = boost;
  boostValue.textContent = `${boost}%`;
  boostLabel.textContent = describeBoost(boost);
}

function setStatus(message) {
  statusText.textContent = message;
}

function getTabStorageKey(tabId) {
  return `tab:${tabId}:boost`;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function postBoostMessage(boost) {
  return chrome.tabs.sendMessage(activeTabId, {
    type: 'VOLUME_BOOSTER_SET_GAIN',
    boost
  });
}

async function ensureContentScript() {
  await chrome.scripting.executeScript({
    target: { tabId: activeTabId },
    files: ['content.js']
  });
}

async function sendBoost(boost) {
  if (!activeTabId) {
    setStatus('No active tab found.');
    return;
  }

  await chrome.storage.session.set({ [getTabStorageKey(activeTabId)]: boost });

  try {
    let response;

    try {
      response = await postBoostMessage(boost);
    } catch (error) {
      await ensureContentScript();
      response = await postBoostMessage(boost);
    }

    const mediaCount = response?.mediaCount ?? 0;
    setStatus(
      mediaCount === 1 ? 'Applied to 1 media element.' : `Applied to ${mediaCount} media elements.`
    );
  } catch (error) {
    setStatus('Open a webpage with audio or video, then try again.');
  }
}

function scheduleBoost(boost) {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => sendBoost(boost), 60);
}

async function initialize() {
  const tab = await getActiveTab();
  activeTabId = tab?.id;

  if (!activeTabId) {
    setStatus('No active tab found.');
    return;
  }

  const stored = await chrome.storage.session.get(getTabStorageKey(activeTabId));
  const boost = clampBoost(stored[getTabStorageKey(activeTabId)] ?? DEFAULT_BOOST);
  renderBoost(boost);
  await sendBoost(boost);
}

slider.addEventListener('input', (event) => {
  const boost = clampBoost(event.target.value);
  renderBoost(boost);
  scheduleBoost(boost);
});

presetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const boost = clampBoost(button.dataset.boost);
    renderBoost(boost);
    sendBoost(boost);
  });
});

initialize();
