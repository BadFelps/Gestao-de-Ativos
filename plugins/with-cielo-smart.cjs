const { withAndroidManifest, withGradleProperties } = require('@expo/config-plugins');

const CIELO_INTEGRATION_META_NAME = 'cs_integration_type';
const CIELO_INTEGRATION_META_VALUE = 'uri';

function ensureCieloIntegrationMetadata(androidManifest) {
  const application = androidManifest.manifest.application?.[0];

  if (!application) {
    throw new Error('AndroidManifest.xml does not contain an <application> tag.');
  }

  application['meta-data'] = application['meta-data'] || [];

  const existingMetadata = application['meta-data'].find(
    (item) => item.$?.['android:name'] === CIELO_INTEGRATION_META_NAME
  );

  if (existingMetadata) {
    existingMetadata.$['android:value'] = CIELO_INTEGRATION_META_VALUE;
  } else {
    application['meta-data'].push({
      $: {
        'android:name': CIELO_INTEGRATION_META_NAME,
        'android:value': CIELO_INTEGRATION_META_VALUE
      }
    });
  }

  return androidManifest;
}

function setGradleProperty(properties, key, value) {
  const existingProperty = properties.find((property) => property.type === 'property' && property.key === key);

  if (existingProperty) {
    existingProperty.value = value;
  } else {
    properties.push({
      type: 'property',
      key,
      value
    });
  }
}

module.exports = function withCieloSmart(config, options = {}) {
  const minSdkVersion = String(Math.max(Number(options.minSdkVersion || 23), 23));

  config = withAndroidManifest(config, (modConfig) => {
    modConfig.modResults = ensureCieloIntegrationMetadata(modConfig.modResults);
    return modConfig;
  });

  config = withGradleProperties(config, (modConfig) => {
    setGradleProperty(modConfig.modResults, 'android.minSdkVersion', minSdkVersion);
    return modConfig;
  });

  return config;
};
