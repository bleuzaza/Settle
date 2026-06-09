# Settle iOS

App Expo (React Native) — décharge mentale : notes, agenda, **dictée vocale**.

Déploiement TestFlight **comme Panium** : Xcode sur GitHub Actions + tes secrets Apple (pas d'EAS, pas de compte Expo).

## Stack

- Expo SDK 54 · React Native
- `expo-speech-recognition` (dictée — build natif / TestFlight uniquement)
- CI : `expo prebuild` → `xcodebuild archive` → TestFlight

## Secrets GitHub (mêmes que Panium)

| Secret | Description |
|--------|-------------|
| `ASC_KEY_ID` | Clé API App Store Connect |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_PRIVATE_KEY` | Contenu du `.p8` |
| `IOS_DISTRIBUTION_CERTIFICATE_BASE64` | Certificat Distribution `.p12` (base64) |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | Mot de passe du `.p12` |
| `KEYCHAIN_PASSWORD` | Mot de passe trousseau CI |
| `IOS_DISTRIBUTION_CERTIFICATE_ID` | ID certificat Apple (recommandé) |

## TestFlight

1. Créer l'app **Settle** + bundle `com.cashthetrain.settle` sur Apple Developer **et App Store Connect**
2. Copier les secrets GitHub depuis Panium (même compte Apple)
3. Lancer et surveiller :
   - `RUN-TESTFLIGHT.bat` — lance le workflow
   - `BABYSIT-TESTFLIGHT.bat` — attend la fin et extrait les erreurs dans `Output/`

Voir [docs/TESTFLIGHT.md](docs/TESTFLIGHT.md).

## Dev local (Windows)

```powershell
cd D:\APPSTORE\Settle
npm install
npm start
```

Expo Go = UI seulement. La dictée nécessite un build natif (TestFlight).

## Bundle ID

`com.cashthetrain.settle` — Team `4N92TKQ397`
