# Settle — TestFlight (pipeline Panium)

Pas de Mac. Pas d'Expo/EAS. Même modèle que **Panium**.

## Prérequis Apple

1. [App Store Connect](https://appstoreconnect.apple.com) — app **Settle**
2. [Developer](https://developer.apple.com/account/resources/identifiers/list) — App ID `com.cashthetrain.settle`
3. Clé API ASC (Users and Access → Integrations)

## Secrets GitHub

**Les mêmes que Panium** — copie-les sur le repo `bleuzaza/Settle` :

| Secret | Notes |
|--------|-------|
| `ASC_KEY_ID` | Identique Panium |
| `ASC_ISSUER_ID` | Identique Panium |
| `ASC_PRIVATE_KEY` | Identique Panium |
| `IOS_DISTRIBUTION_CERTIFICATE_BASE64` | Identique Panium |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | Identique Panium |
| `KEYCHAIN_PASSWORD` | Identique Panium |
| `IOS_DISTRIBUTION_CERTIFICATE_ID` | Identique Panium |

Le certificat Distribution est **partagé** entre toutes tes apps sur le même compte Apple. Seul le **profil de provisioning** est régénéré pour `com.cashthetrain.settle` à chaque build.

## Lancer une build

1. GitHub → **Actions** → **Settle TestFlight** → **Run workflow**
2. Laisser **Uploader vers TestFlight** coché
3. ~25–45 min (prebuild Expo + CocoaPods + archive Xcode)
4. App Store Connect → **TestFlight** → build **Processing** → **Ready to test**

## Dictée vocale

Fonctionne sur la build TestFlight (modules natifs compilés). **Pas** dans Expo Go.

## Dépannage

| Problème | Action |
|----------|--------|
| Profil / certificat | Vérifier les 6 secrets (comme Panium) |
| `scheme Settle not found` | Vérifier `app.json` → `"name": "Settle"` |
| Build number déjà utilisé | Relancer le workflow (numéro auto-incrémenté) |
| ITMS-90035 | Le workflow vérifie la signature Distribution automatiquement |
