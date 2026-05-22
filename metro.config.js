const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'wasm' to the list of asset extensions for SQLite web worker
config.resolver.assetExts.push('wasm');

module.exports = config;
