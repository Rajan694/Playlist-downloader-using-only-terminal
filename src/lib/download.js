'use strict'

const path = require('path')
const ytDlp = require('yt-dlp-exec')
const { renderProgressBar } = require('./progress')

async function downloadAudioForItem (item, targetDir) {
  const videoUrl = `https://www.youtube.com/watch?v=${item.id}`

  return new Promise((resolve, reject) => {
    const subprocess = ytDlp.exec(videoUrl, {
      output: path.join(targetDir, '%(title)s [%(id)s].%(ext)s'),
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      quiet: true,
      noWarnings: true
    })

    subprocess.stderr.on('data', chunk => {
      const text = chunk.toString()
      const match = text.match(/(\d+(?:\.\d+)?)%/)
      if (match) {
        const percent = Number.parseFloat(match[1])
        if (!Number.isNaN(percent)) renderProgressBar(percent)
      }
    })

    subprocess.on('error', err => {
      process.stdout.write('\n')
      reject(err)
    })

    subprocess.on('close', code => {
      process.stdout.write('\n')
      if (code === 0) resolve()
      else reject(new Error(`yt-dlp exited with code ${code}`))
    })
  })
}

module.exports = {
  downloadAudioForItem
}
