'use strict';

const path = require('path');
const ytDlp = require('yt-dlp-exec');
const { renderProgressBar } = require('./progress');

function formatFileName(title) {
  if (!title) return 'audio';

  // Stop at first special character (anything except letters, numbers, and space)
  const clean = title.split(/[^a-zA-Z0-9 ]/)[0];

  // Trim and limit length
  return clean.trim().slice(0, 50) || 'audio';
}

async function getVideoTitle(videoUrl) {
  return new Promise((resolve, reject) => {
    const subprocess = ytDlp.exec(videoUrl, {
      getTitle: true,
      quiet: true,
    });

    let title = '';

    subprocess.stdout.on('data', (chunk) => {
      title += chunk.toString();
    });

    subprocess.on('close', (code) => {
      if (code === 0) resolve(title.trim());
      else reject(new Error('Failed to get title'));
    });

    subprocess.on('error', reject);
  });
}

async function downloadAudioForItem(item, targetDir) {
  const videoUrl = `https://www.youtube.com/watch?v=${item.id}`;
  const rawTitle = await getVideoTitle(videoUrl);
  const fileName = formatFileName(rawTitle);

  return new Promise((resolve, reject) => {
    renderProgressBar(0);

    const subprocess = ytDlp.exec(
      videoUrl,
      {
        output: path.join(targetDir, `${fileName} [%(id)s].%(ext)s`),
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 0,
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

    subprocess.on('close', (code) => {
      process.stdout.write('\n');
      if (code === 0) resolve();
      else reject(new Error(`yt-dlp exited with code ${code}`));
    });
  });
}

module.exports = {
  downloadAudioForItem,
};
