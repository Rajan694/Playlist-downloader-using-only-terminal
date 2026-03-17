'use strict';

const { formatFileName } = require('./filename');

require('dotenv').config();
let NodeID3 = null;
let geniusClient = null;

// Lazy-load optional dependencies so downloads still work even if
// lyrics packages are not installed or misconfigured.
try {
  // eslint-disable-next-line global-require
  NodeID3 = require('node-id3');
} catch {
  NodeID3 = null;
}

try {
  // eslint-disable-next-line global-require
  const Genius = require('genius-lyrics');
  // If GENIUS_TOKEN is set, use it; otherwise the client will fall back to scraping.
  geniusClient = new Genius.Client(process.env.GENIUS_TOKEN);
} catch {
  geniusClient = null;
}

async function embedLyricsIfPossible(fileName, finalFilePath) {
  if (!NodeID3 || !geniusClient) return;
  if (!fileName) return;

  try {
    const results = await geniusClient.songs.search(fileName);
    if (!results || !results.length) return;

    const song = results[0];
    const lyrics = await song.lyrics();
    if (!lyrics) return;

    const tags = {
      unsynchronisedLyrics: {
        language: 'eng',
        text: lyrics,
      },
    };

    // Use update to merge with existing tags written by yt-dlp.
    NodeID3.update(tags, finalFilePath);
  } catch (err) {
    // Non-fatal: if lyrics fetching fails, just continue.
    console.error('Warning: failed to fetch/embed lyrics:', err.message || err);
  }
}

module.exports = {
  embedLyricsIfPossible,
};
