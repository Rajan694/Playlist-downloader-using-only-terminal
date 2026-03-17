'use strict';

function formatFileName(title) {
  if (!title) return 'audio';

  // Stop at first special character (anything except letters, numbers, and space)
  const clean = title.split(/[^a-zA-Z0-9 ]/)[0];

  // Trim and limit length
  return clean.trim().slice(0, 50) || 'audio';
}

module.exports = {
  formatFileName,
};

