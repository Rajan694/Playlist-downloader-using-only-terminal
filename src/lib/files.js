'use strict'

const fs = require('fs').promises

function estimateTotalSizeMb (entries) {
  const AVERAGE_BITRATE_KBPS = 192
  const SAFETY_FACTOR = 1.25
  const totalSeconds = entries.reduce(
    (sum, entry) => sum + (entry.duration || 0),
    0
  )
  const totalBytes =
    totalSeconds * ((AVERAGE_BITRATE_KBPS * 1000) / 8) * SAFETY_FACTOR
  return totalBytes / (1024 * 1024)
}

async function findExistingIds (targetDir, playlistItems) {
  const files = await fs.readdir(targetDir)
  const existingIds = new Set()
  const idPattern = /\[([A-Za-z0-9_-]{6,})\]\.mp3$/

  for (const file of files) {
    const match = file.match(idPattern)
    if (match) existingIds.add(match[1])
  }

  const existing = []
  const missing = []

  for (const item of playlistItems) {
    if (item.id && existingIds.has(item.id)) existing.push(item)
    else missing.push(item)
  }

  return { existing, missing }
}

module.exports = {
  estimateTotalSizeMb,
  findExistingIds
}
