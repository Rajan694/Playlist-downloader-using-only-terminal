'use strict';

const ytDlp = require('yt-dlp-exec');

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

module.exports = {
  getVideoTitle,
};

