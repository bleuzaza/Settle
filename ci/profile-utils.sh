#!/usr/bin/env bash
# Profils .mobileprovision — app Settle
set -euo pipefail

BUNDLE_ID_APP="${BUNDLE_ID_APP:-com.cashthetrain.settle}"
PROFILE_DIR="${HOME}/Library/MobileDevice/Provisioning Profiles"

profile_install_uuid_only() {
  local provision_path="$1"
  local plist="${provision_path}.decoded.plist"
  security cms -D -i "$provision_path" > "$plist"
  local uuid
  uuid=$(/usr/libexec/PlistBuddy -c 'Print :UUID' "$plist")
  mkdir -p "$PROFILE_DIR"
  cp "$provision_path" "${PROFILE_DIR}/${uuid}.mobileprovision"
  echo "$uuid"
}

profile_verify_bundle_id() {
  local provision_path="$1"
  local plist="${provision_path}.decoded.plist"
  security cms -D -i "$provision_path" > "$plist"
  local app_id
  app_id=$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' "$plist" 2>/dev/null || true)
  if ! echo "$app_id" | grep -q "$BUNDLE_ID_APP"; then
    echo "::error::Profil pour $app_id — attendu *$BUNDLE_ID_APP"
    return 1
  fi
  /usr/libexec/PlistBuddy -c 'Print :UUID' "$plist"
}

write_release_xcconfig() {
  local app_uuid="$1"
  mkdir -p ci
  cat > ci/Release-App.xcconfig <<EOF
// Généré par CI — ne pas committer
CODE_SIGN_STYLE = Manual
CODE_SIGN_IDENTITY = Apple Distribution
DEVELOPMENT_TEAM = 4N92TKQ397
PROVISIONING_PROFILE_SPECIFIER = ${app_uuid}
EOF
  cat > ExportOptions-ci.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store</string>
	<key>teamID</key>
	<string>4N92TKQ397</string>
	<key>signingStyle</key>
	<string>manual</string>
	<key>uploadSymbols</key>
	<true/>
	<key>stripSwiftSymbols</key>
	<true/>
	<key>provisioningProfiles</key>
	<dict>
		<key>${BUNDLE_ID_APP}</key>
		<string>${app_uuid}</string>
	</dict>
</dict>
</plist>
EOF
}
