const { withAndroidManifest, withGradleProperties, withProjectBuildGradle } = require('@expo/config-plugins');

const CIELO_INTEGRATION_META_NAME = 'cs_integration_type';
const CIELO_INTEGRATION_META_VALUE = 'uri';
const ANDROID_TOOLS_NAMESPACE = 'http://schemas.android.com/tools';

function ensureAndroidToolsNamespace(androidManifest) {
  androidManifest.manifest.$ = androidManifest.manifest.$ || {};
  androidManifest.manifest.$['xmlns:tools'] = androidManifest.manifest.$['xmlns:tools'] || ANDROID_TOOLS_NAMESPACE;
}

function ensureCieloIntegrationMetadata(androidManifest) {
  ensureAndroidToolsNamespace(androidManifest);

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
    existingMetadata.$['tools:replace'] = 'android:value';
  } else {
    application['meta-data'].push({
      $: {
        'android:name': CIELO_INTEGRATION_META_NAME,
        'android:value': CIELO_INTEGRATION_META_VALUE,
        'tools:replace': 'android:value'
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

function ensureCieloMavenRepository(buildGradle) {
  const repositoryLine = 'url("$rootDir/../node_modules/react-native-lio/android/cielo-sdk")';
  if (buildGradle.includes(repositoryLine)) {
    return buildGradle;
  }

  return buildGradle.replace(
    /allprojects\s*\{\s*repositories\s*\{/,
    (match) => `${match}\n        maven { ${repositoryLine} }`
  );
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

  config = withProjectBuildGradle(config, (modConfig) => {
    modConfig.modResults.contents = ensureCieloMavenRepository(modConfig.modResults.contents);
    return modConfig;
  });

  return config;
};
