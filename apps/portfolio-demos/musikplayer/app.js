const TRACKS = [
  {
    title: "Neon City",
    artist: "Beirit Beats",
    mood: "Late-night focus",
    duration: 36,
    notes: [261.63, 329.63, 392.0, 523.25, 392.0, 329.63],
  },
  {
    title: "Soft Circuit",
    artist: "Digital Lounge",
    mood: "Calm workflow",
    duration: 42,
    notes: [220.0, 277.18, 329.63, 369.99, 329.63, 277.18],
  },
  {
    title: "Morning Pulse",
    artist: "Studio North",
    mood: "Bright energy",
    duration: 38,
    notes: [293.66, 369.99, 440.0, 587.33, 440.0, 369.99],
  },
  {
    title: "Deep Glass",
    artist: "Quiet Signal",
    mood: "Ambient demo",
    duration: 45,
    notes: [196.0, 246.94, 293.66, 392.0, 293.66, 246.94],
  },
];

const elements = {
  card: document.querySelector(".player-card"),
  searchButton: document.querySelector("#searchButton"),
  searchPanel: document.querySelector("#searchPanel"),
  searchInput: document.querySelector("#trackSearch"),
  powerButton: document.querySelector("#powerButton"),
  playButton: document.querySelector("#playButton"),
  playIcon: document.querySelector("#playIcon"),
  previousButton: document.querySelector("#previousButton"),
  nextButton: document.querySelector("#nextButton"),
  shuffleButton: document.querySelector("#shuffleButton"),
  repeatButton: document.querySelector("#repeatButton"),
  progressRange: document.querySelector("#progressRange"),
  currentTime: document.querySelector("#currentTime"),
  duration: document.querySelector("#duration"),
  volumeRange: document.querySelector("#volumeRange"),
  volumeValue: document.querySelector("#volumeValue"),
  title: document.querySelector("#trackTitle"),
  artist: document.querySelector("#trackArtist"),
  mood: document.querySelector("#trackMood"),
  trackCount: document.querySelector("#trackCount"),
  playlistItems: document.querySelector("#playlistItems"),
};

let currentTrackIndex = 0;
let currentTime = 0;
let isPlaying = false;
let isPoweredOn = true;
let isShuffleEnabled = false;
let isRepeatEnabled = false;
let timerId = null;
let audioContext = null;
let gainNode = null;
let oscillator = null;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function getCurrentTrack() {
  return TRACKS[currentTrackIndex];
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function stopTone() {
  if (!oscillator) {
    return;
  }

  oscillator.stop();
  oscillator.disconnect();
  oscillator = null;
}

function playTone() {
  if (!isPoweredOn || !isPlaying) {
    return;
  }

  ensureAudioContext();
  stopTone();

  const track = getCurrentTrack();
  const noteIndex = Math.floor(currentTime * 2) % track.notes.length;
  oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = track.notes[noteIndex];
  gainNode.gain.value = Number(elements.volumeRange.value) / 100 * 0.16;
  oscillator.connect(gainNode);
  oscillator.start();
}

function renderTrack() {
  const track = getCurrentTrack();

  elements.title.textContent = track.title;
  elements.artist.textContent = track.artist;
  elements.mood.textContent = track.mood;
  elements.duration.textContent = formatTime(track.duration);
  elements.progressRange.max = String(track.duration);
  elements.progressRange.value = String(currentTime);
  elements.currentTime.textContent = formatTime(currentTime);

  document.querySelectorAll(".track-button").forEach((button, index) => {
    const isActive = index === currentTrackIndex;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function renderPlaybackState() {
  elements.card.classList.toggle("is-playing", isPlaying);
  elements.card.classList.toggle("is-powered-off", !isPoweredOn);
  elements.playIcon.textContent = isPlaying ? "Ⅱ" : "▶";
  elements.playButton.setAttribute("aria-label", isPlaying ? "Pausieren" : "Abspielen");
  elements.shuffleButton.setAttribute("aria-pressed", String(isShuffleEnabled));
  elements.repeatButton.setAttribute("aria-pressed", String(isRepeatEnabled));

  [
    elements.playButton,
    elements.previousButton,
    elements.nextButton,
    elements.shuffleButton,
    elements.repeatButton,
    elements.progressRange,
    elements.volumeRange,
  ].forEach((element) => {
    element.disabled = !isPoweredOn;
  });
}

function updateProgress() {
  const track = getCurrentTrack();
  currentTime = Math.min(currentTime + 1, track.duration);

  if (currentTime >= track.duration) {
    if (isRepeatEnabled) {
      currentTime = 0;
      playTone();
    } else {
      setTrack(getNextIndex());
      startPlayback();
      return;
    }
  }

  elements.progressRange.value = String(currentTime);
  elements.currentTime.textContent = formatTime(currentTime);
  playTone();
}

function startPlayback() {
  if (!isPoweredOn || isPlaying) {
    return;
  }

  isPlaying = true;
  renderPlaybackState();
  playTone();
  timerId = window.setInterval(updateProgress, 1000);
}

function pausePlayback() {
  isPlaying = false;
  window.clearInterval(timerId);
  timerId = null;
  stopTone();
  renderPlaybackState();
}

function togglePlayback() {
  if (isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function getNextIndex() {
  if (isShuffleEnabled) {
    const options = TRACKS.map((_, index) => index).filter((index) => index !== currentTrackIndex);
    return options[Math.floor(Math.random() * options.length)] ?? currentTrackIndex;
  }

  return (currentTrackIndex + 1) % TRACKS.length;
}

function getPreviousIndex() {
  return (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
}

function setTrack(index) {
  currentTrackIndex = index;
  currentTime = 0;
  stopTone();
  renderTrack();

  if (isPlaying) {
    playTone();
  }
}

function renderPlaylist(filter = "") {
  const normalizedFilter = filter.trim().toLocaleLowerCase("de-DE");
  const visibleTracks = TRACKS.map((track, index) => ({ track, index })).filter(({ track }) => {
    const searchable = `${track.title} ${track.artist} ${track.mood}`.toLocaleLowerCase("de-DE");
    return searchable.includes(normalizedFilter);
  });

  elements.playlistItems.replaceChildren(
    ...visibleTracks.map(({ track, index }) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "track-button";
      button.addEventListener("click", () => {
        setTrack(index);
        startPlayback();
      });

      const number = document.createElement("span");
      number.className = "track-number";
      number.textContent = String(index + 1).padStart(2, "0");

      const meta = document.createElement("span");
      meta.className = "track-meta";

      const title = document.createElement("strong");
      title.textContent = track.title;

      const artist = document.createElement("span");
      artist.textContent = track.artist;

      const duration = document.createElement("span");
      duration.className = "track-duration";
      duration.textContent = formatTime(track.duration);

      meta.append(title, artist);
      button.append(number, meta, duration);
      item.append(button);
      return item;
    })
  );

  elements.trackCount.textContent = `${visibleTracks.length} ${visibleTracks.length === 1 ? "Titel" : "Titel"}`;
  renderTrack();
}

elements.playButton.addEventListener("click", togglePlayback);

elements.nextButton.addEventListener("click", () => {
  setTrack(getNextIndex());
  startPlayback();
});

elements.previousButton.addEventListener("click", () => {
  setTrack(getPreviousIndex());
  startPlayback();
});

elements.shuffleButton.addEventListener("click", () => {
  isShuffleEnabled = !isShuffleEnabled;
  renderPlaybackState();
});

elements.repeatButton.addEventListener("click", () => {
  isRepeatEnabled = !isRepeatEnabled;
  renderPlaybackState();
});

elements.powerButton.addEventListener("click", () => {
  isPoweredOn = !isPoweredOn;

  if (!isPoweredOn) {
    pausePlayback();
  }

  renderPlaybackState();
});

elements.searchButton.addEventListener("click", () => {
  const shouldOpen = elements.searchPanel.hidden;
  elements.searchPanel.hidden = !shouldOpen;
  elements.searchButton.setAttribute("aria-pressed", String(shouldOpen));

  if (shouldOpen) {
    window.requestAnimationFrame(() => elements.searchInput.focus());
  } else {
    elements.searchInput.value = "";
    renderPlaylist();
  }
});

elements.searchInput.addEventListener("input", () => {
  renderPlaylist(elements.searchInput.value);
});

elements.progressRange.addEventListener("input", () => {
  currentTime = Number(elements.progressRange.value);
  elements.currentTime.textContent = formatTime(currentTime);

  if (isPlaying) {
    playTone();
  }
});

elements.volumeRange.addEventListener("input", () => {
  const volume = Number(elements.volumeRange.value);
  elements.volumeValue.textContent = `${volume}%`;

  if (gainNode) {
    gainNode.gain.value = volume / 100 * 0.16;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input")) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePlayback();
  }
});

renderPlaylist();
renderPlaybackState();
