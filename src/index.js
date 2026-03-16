#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const readline = require('readline');
const { getPlaylistInfo, estimateTotalSizeMb, findExistingIds, downloadAudioForItem } = require('./lib');
const userSettingsPath = path.join(__dirname, '../public/userSettings.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function isYes(input) {
  const normalized = (input || '').trim().toLowerCase();
  return normalized === '' || normalized === 'y' || normalized === 'yes';
}

async function loadUserSettings() {
  try {
    const raw = await fs.readFile(userSettingsPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.playlistUrl === 'string' &&
      parsed.playlistUrl.trim() &&
      typeof parsed.outputPath === 'string' &&
      parsed.outputPath.trim()
    ) {
      return {
        playlistUrl: parsed.playlistUrl.trim(),
        outputPath: parsed.outputPath.trim(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

async function saveUserSettings(settings) {
  try {
    const dir = path.dirname(userSettingsPath);
    await fs.mkdir(dir, { recursive: true });
    const payload = {
      playlistUrl: settings.playlistUrl,
      outputPath: settings.outputPath,
    };
    await fs.writeFile(userSettingsPath, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('Warning: failed to save user settings:', err.message || err);
  }
}
function checkForPathExists(path) {
  if (!path) {
    console.error('Playlist URL is required.');
    rl.close();
    process.exit(1);
  }
}

function checkForFolderExists(path) {
  if (!path) {
    console.error('Output folder is required.');
    rl.close();
    process.exit(1);
  }
}

async function resolvePlaylistAndOutputPath() {
  const saved = await loadUserSettings();
  const hasSaved =
    saved &&
    typeof saved.playlistUrl === 'string' &&
    saved.playlistUrl.trim() &&
    typeof saved.outputPath === 'string' &&
    saved.outputPath.trim();

  let playlistUrl;
  let outputPathRaw;

  if (hasSaved) {
    console.log('\nSaved settings found:');
    console.log(`Playlist URL: ${saved.playlistUrl}`);
    console.log(`Output folder: ${saved.outputPath}`);

    console.log('\nWhat would you like to do?');
    console.log('1) Update playlist name');
    console.log('2) Update address');
    console.log('3) Continue with saved settings');

    const choiceInput = await ask('Choose an option (1-3, Enter = 3, b = back, x = exit): ');
    const choiceNormalized = (choiceInput || '').trim().toLowerCase();

    if (choiceNormalized === 'b' || choiceNormalized === 'back') {
      return null;
    }

    if (choiceNormalized === 'x' || choiceNormalized === 'exit') {
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
    }

    const choice = choiceNormalized || '3';

    if (choice === '3') {
      playlistUrl = saved.playlistUrl;
      outputPathRaw = saved.outputPath;
    } else {
      const playlistDefault = saved.playlistUrl;
      const playlistPrompt = `Enter YouTube playlist URL (press Enter for default: ${playlistDefault}, b = back, x = exit): `;
      const playlistInput = await ask(playlistPrompt);
      const playlistNormalized = (playlistInput || '').trim().toLowerCase();
      if (playlistNormalized === 'b' || playlistNormalized === 'back') {
        return null;
      }
      if (playlistNormalized === 'x' || playlistNormalized === 'exit') {
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
      }
      playlistUrl = (playlistInput || playlistDefault || '').trim();
      checkForPathExists(playlistUrl);
      const folderDefault = saved.outputPath;
      const folderPrompt = `Enter output folder path (press Enter for default: ${folderDefault}, b = back, x = exit): `;
      const folderInput = await ask(folderPrompt);
      const folderNormalized = (folderInput || '').trim().toLowerCase();
      if (folderNormalized === 'b' || folderNormalized === 'back') {
        return null;
      }
      if (folderNormalized === 'x' || folderNormalized === 'exit') {
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
      }
      outputPathRaw = (folderInput || folderDefault || '').trim();
      checkForFolderExists(outputPathRaw);
    }
  } else {
    const playlistInput = await ask('Enter YouTube playlist URL (b = back, x = exit): ');
    const playlistNormalized = (playlistInput || '').trim().toLowerCase();
    if (playlistNormalized === 'b' || playlistNormalized === 'back') {
      return null;
    }
    if (playlistNormalized === 'x' || playlistNormalized === 'exit') {
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
    }
    playlistUrl = (playlistInput || '').trim();
    checkForPathExists(playlistUrl);
    const folderInput = await ask('Enter output folder path (b = back, x = exit): ');
    const folderNormalized = (folderInput || '').trim().toLowerCase();
    if (folderNormalized === 'b' || folderNormalized === 'back') {
      return null;
    }
    if (folderNormalized === 'x' || folderNormalized === 'exit') {
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
    }
    outputPathRaw = (folderInput || '').trim();
    checkForFolderExists(outputPathRaw);
  }

  const outputPath = path.resolve(outputPathRaw);
  await fs.mkdir(outputPath, { recursive: true });

  return { playlistUrl, outputPath };
}

async function main() {
  try {
    while (true) {
      const letsStartAnswer = await ask('Do you want to start? (Y/n, Enter = yes, x = exit): ');
      const startNormalized = (letsStartAnswer || '').trim().toLowerCase();

      if (startNormalized === 'x' || startNormalized === 'exit') {
        console.log('Goodbye!');
        rl.close();
        return;
      }

      if (!isYes(letsStartAnswer)) {
        console.log('Goodbye!');
        rl.close();
        return;
      }

      const resolved = await resolvePlaylistAndOutputPath();
      if (!resolved) {
        // user chose to go back from playlist/path prompts
        continue;
      }

      const { playlistUrl, outputPath } = resolved;

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
        await saveUserSettings({ playlistUrl, outputPath });
        rl.close();
        process.exit(0);
      }

      const confirmAnswer = await ask('\nPress "y" (or Enter) to start download, "b" to go back, or "x" to cancel: ');
      const confirmNormalized = (confirmAnswer || '').trim().toLowerCase();

      if (confirmNormalized === 'b' || confirmNormalized === 'back') {
        // go back to the start question
        continue;
      }

      if (!isYes(confirmAnswer)) {
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

      await saveUserSettings({ playlistUrl, outputPath });

      console.log('\nAll files downloaded. Exiting gracefully.');
      process.exit(0);
    }
  } catch (error) {
    rl.close();
    console.error('\nError:', error.message || error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
