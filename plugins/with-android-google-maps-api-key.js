const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins");

const MAPS_META_DATA_NAME = "com.google.android.geo.API_KEY";

function getGoogleMapsApiKey(config, props) {
  return (
    props?.apiKey ||
    config.android?.config?.googleMaps?.apiKey ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ""
  );
}

function withAndroidGoogleMapsApiKey(config, props = {}) {
  return withAndroidManifest(config, (nextConfig) => {
    const apiKey = getGoogleMapsApiKey(nextConfig, props);
    if (!apiKey) {
      return nextConfig;
    }

    const manifest = nextConfig.modResults;
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    application["meta-data"] = application["meta-data"] || [];

    const metadata = application["meta-data"];
    const existing = metadata.find((item) => item.$?.["android:name"] === MAPS_META_DATA_NAME);
    if (existing) {
      existing.$["android:value"] = apiKey;
    } else {
      metadata.push({
        $: {
          "android:name": MAPS_META_DATA_NAME,
          "android:value": apiKey,
        },
      });
    }

    return nextConfig;
  });
}

module.exports = withAndroidGoogleMapsApiKey;
