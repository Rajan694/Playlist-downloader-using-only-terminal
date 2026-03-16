#!/usr/bin/env node
'use strict';

const staticPlaylistUrl = 'https://youtube.com/playlist?list=PLIIfCgZ6D3Xur62nhLuocH5u07jpPYYPd&si=wmRLr3TiQKl9-VS7';
const staticFolderPath = '/home/rajan/Downloads/testing';
const path = require('path');
const fs = require('fs').promises;
const readline = require('readline');
const { getPlaylistInfo, estimateTotalSizeMb, findExistingIds, downloadAudioForItem } = require('./lib');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  try {
    const letsStart = await ask('Do you want to start? (y/n)');
    if (letsStart !== 'y') {
      console.log('Goodbye!');
      rl.close();
      return;
    }
    let playlistUrl = '';
    if (staticPlaylistUrl) {
      playlistUrl = staticPlaylistUrl;
    } else {
      playlistUrl = await ask('Enter YouTube playlist URL: ');
      if (!playlistUrl) {
        console.error('Playlist URL is required.');
        rl.close();
        process.exit(1);
      }
    }
    let outputPath = '';
    if (staticFolderPath) {
      outputPath = path.resolve(staticFolderPath);
    } else {
      userOutputPath = await ask('Enter output folder path: ');
      if (!userOutputPath) {
        console.error('Output folder path is required.');
        rl.close();
        process.exit(1);
      }
      outputPath = path.resolve(userOutputPath);
    }
    await fs.mkdir(outputPath, { recursive: true });

    console.log('\nFetching playlist information...');
    const playlist = await getPlaylistInfo(playlistUrl);

    if (!playlist.items.length) {
      console.error('Playlist appears to be empty.');
      rl.close();
      process.exit(1);
    }

    const { existing, missing } = await findExistingIds(outputPath, playlist.items);

    const approxMb = estimateTotalSizeMb(missing);

    console.log(`\nPlaylist: ${playlist.title}`);
    console.log(`Total items in playlist: ${playlist.items.length}`);
    console.log(`Already present in folder: ${existing.length}`);
    console.log(`Will download: ${missing.length}`);
    console.log(`Estimated download size (upper bound): ${approxMb.toFixed(2)} MB`);

    if (!missing.length) {
      console.log('\nAll items are already present. Nothing to download.');
      rl.close();
      process.exit(0);
    }

    const confirm = (await ask('\nPress "y" to start download or "x" to cancel: ')).toLowerCase();

    if (confirm !== 'y') {
      console.log('Download cancelled.');
      rl.close();
      process.exit(0);
    }

    rl.close();
    console.log('\nStarting downloads...\n');

    let index = 0;

    for (const item of missing) {
      index += 1;
      console.log(`\n[${index}/${missing.length}] ${item.title}`);
      await downloadAudioForItem(item, outputPath);
    }

    console.log('\nAll files downloaded. Exiting gracefully.');
    process.exit(0);
  } catch (error) {
    rl.close();
    console.error('\nError:', error.message || error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
