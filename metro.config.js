const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = mergeConfig(getDefaultConfig(__dirname), {
  transformer: {
    unstable_allowRequireContext: true,
  },
});

module.exports = withNativeWind(config, {
  input: "./globals.css",
  inlineRem: 16,
});