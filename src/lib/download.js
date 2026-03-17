'use strict';
const path = require('path');
const ytDlp = require('yt-dlp-exec');
const { renderProgressBar } = require('./progress');
const { formatFileName } = require('./filename');
const { embedLyricsIfPossible } = require('./lyrics');
const { getVideoTitle } = require('./videoTitle');

async function downloadAudioForItem(item, targetDir) {
  const videoUrl = `https://www.youtube.com/watch?v=${item.id}`;
  const rawTitle = await getVideoTitle(videoUrl);
  const fileName = formatFileName(rawTitle);
  const outputTemplate = path.join(targetDir, `${fileName} [%(id)s].%(ext)s`);
  const finalFilePath = path.join(targetDir, `${fileName} [${item.id}].mp3`);

  return new Promise((resolve, reject) => {
    renderProgressBar(0);

    const subprocess = ytDlp.exec(
      videoUrl,
      {
        output: outputTemplate,
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 0,
        addMetadata: true,
        embedThumbnail: true,
        noWarnings: true,
        progress: true,
      },
      {
        stderr: 'pipe',
        stdout: 'pipe',
      },
    );

    const handleProgressChunk = (chunk) => {
      const text = chunk.toString();
      const match = text.match(/(\d+(?:\.\d+)?)%/);
      if (match) {
        const percent = Number.parseFloat(match[1]);
        if (!Number.isNaN(percent)) renderProgressBar(percent);
      }
    };

    if (subprocess.stderr) subprocess.stderr.on('data', handleProgressChunk);
    if (subprocess.stdout) subprocess.stdout.on('data', handleProgressChunk);

    subprocess.on('error', (err) => {
      process.stdout.write('\n');
      reject(err);
    });

    subprocess.on('close', async (code) => {
      process.stdout.write('\n');
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}`));
        return;
      }

      await embedLyricsIfPossible(fileName, finalFilePath);
      resolve();
    });
  });
}

module.exports = {
  downloadAudioForItem,
};
