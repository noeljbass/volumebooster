(() => {
  if (globalThis.__volumeBoosterContentLoaded) {
    return;
  }

  globalThis.__volumeBoosterContentLoaded = true;

  const DEFAULT_BOOST = 100;
  const MIN_BOOST = 0;
  const MAX_BOOST = 600;
  const MEDIA_SELECTOR = 'audio, video';

  let audioContext;
  let currentBoost = DEFAULT_BOOST;
  const boostedElements = new WeakMap();

  function clampBoost(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return DEFAULT_BOOST;
    }

    return Math.min(MAX_BOOST, Math.max(MIN_BOOST, numericValue));
  }

  function getAudioContext() {
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => undefined);
    }

    return audioContext;
  }

  function getMediaElements() {
    return Array.from(document.querySelectorAll(MEDIA_SELECTOR));
  }

  function connectMediaElement(mediaElement) {
    if (boostedElements.has(mediaElement)) {
      return boostedElements.get(mediaElement);
    }

    const context = getAudioContext();
    const source = context.createMediaElementSource(mediaElement);
    const gain = context.createGain();

    source.connect(gain);
    gain.connect(context.destination);
    boostedElements.set(mediaElement, { gain, source });

    return { gain, source };
  }

  function applyBoostToElement(mediaElement, boost) {
    const { gain } = connectMediaElement(mediaElement);
    gain.gain.value = boost / 100;
  }

  function applyBoost(boost) {
    currentBoost = clampBoost(boost);
    const mediaElements = getMediaElements();
    let boostedCount = 0;

    mediaElements.forEach((mediaElement) => {
      try {
        applyBoostToElement(mediaElement, currentBoost);
        boostedCount += 1;
      } catch (error) {
        mediaElement.dataset.volumeBoosterError = error.message;
      }
    });

    return boostedCount;
  }

  function nodeContainsMedia(node) {
    if (!(node instanceof Element)) {
      return false;
    }

    return node.matches(MEDIA_SELECTOR) || Boolean(node.querySelector(MEDIA_SELECTOR));
  }

  const observer = new MutationObserver((mutations) => {
    const hasNewMedia = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some(nodeContainsMedia)
    );

    if (hasNewMedia) {
      applyBoost(currentBoost);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'VOLUME_BOOSTER_SET_GAIN') {
      return false;
    }

    const mediaCount = applyBoost(message.boost);
    sendResponse({ ok: true, mediaCount });

    return true;
  });
})();
