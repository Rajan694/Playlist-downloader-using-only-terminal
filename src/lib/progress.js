'use strict'

function renderProgressBar (percent) {
  const cols = process.stdout.columns || 80
  const barWidth = Math.max(10, Math.min(40, cols - 20))
  const filled = Math.round((percent / 100) * barWidth)
  const empty = barWidth - filled
  const bar = '#'.repeat(filled) + '-'.repeat(empty)
  process.stdout.write(`\r[${bar}] ${percent.toFixed(1)}%`)
}

module.exports = {
  renderProgressBar
}

