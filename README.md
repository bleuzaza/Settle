# Settle — iOS (Swift natif)

App de décharge mentale : notes, agenda, dictée vocale.

## Structure (comme Panium)

```
Settle/           App SwiftUI
project.yml       XcodeGen
ci/               Pipeline signing + archive
.github/workflows/
  settle-testflight.yml         Archive + IPA (artifact Settle-ipa)
  settle-upload-testflight.yml  Upload TestFlight seul (réutilise IPA)
legacy-rn/        Ancienne version Expo/React Native (référence)
```

## TestFlight

1. **Archive** : `RUN-ARCHIVE.bat` ou workflow `Settle TestFlight` (upload désactivé par défaut)
2. **Upload seul** (si IPA OK mais upload échoué) : `RUN-UPLOAD.bat RUN_ID`

Bundle ID : `com.cashthetrain.settle` · Team : `4N92TKQ397`

Secrets GitHub (identiques à Panium) : `ASC_*`, `IOS_DISTRIBUTION_*`, `KEYCHAIN_PASSWORD`, `IOS_DISTRIBUTION_CERTIFICATE_ID`
