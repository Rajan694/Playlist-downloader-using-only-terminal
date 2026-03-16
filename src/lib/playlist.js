'use strict'

const ytDlp = require('yt-dlp-exec')

async function getPlaylistInfo (url) {
  const result = await ytDlp(url, {
    dumpSingleJson: true,
    skipDownload: true
  })

  if (!result || typeof result !== 'object') {
    throw new Error('Failed to parse playlist information.')
  }

  const entries = Array.isArray(result.entries)
    ? result.entries.filter(Boolean)
    : []

  return {
    title: result.title || '',
    items: entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      duration: entry.duration || 0
    }))
  }
}

module.exports = {
  getPlaylistInfo
}

