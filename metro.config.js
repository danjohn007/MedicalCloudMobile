// metro.config.js
// Expo SDK 54 — React Native 0.81
// Allows importing SVG files as React components (used by `<Icon name="house" />`)
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ── react-native-svg-transformer ────────────────────────────
// Permite `import HouseIcon from '@/assets/icons/regular/house.svg'`
// y usarlo como <HouseIcon width={24} height={24} fill="#000" />
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

module.exports = config;
