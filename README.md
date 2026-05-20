**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Expo Android APK**

This repository also contains a native Expo Android app for Cielo LIO devices. It does not use WebView; the native screens call the Base44 API directly.

1. Configure the same Base44 env vars used by the web app:

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url
VITE_BASE44_FUNCTIONS_VERSION=your_functions_version
```

2. Build the APK with EAS:

```
npm install
npm run build:apk
```

The `preview` EAS profile in `eas.json` is configured to output an APK. For Expo/EAS environments, you can also expose the same values as `EXPO_PUBLIC_BASE44_APP_ID`, `EXPO_PUBLIC_BASE44_APP_BASE_URL`, and `EXPO_PUBLIC_BASE44_FUNCTIONS_VERSION`.

For local native project generation without EAS:

```
npm run native:prebuild
```

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)
