#!/usr/bin/env bash
# Sets MONGO_URI_WRITE + ADMIN_TOKEN on the Vercel project, redeploys, and
# verifies end-to-end that a real signup lands in Mongo.
#
# Needs, in the login keychain:
#   skopnix-vercel-token      Vercel API token (scope: the ctiaze-web team)
#   skopnix-mongo-write-uri   full MONGO_URI_WRITE value
#   skopnix-admin-token       admin dashboard password
# Secrets are read straight from the keychain into variables; none are echoed.
set -euo pipefail

kc() { security find-generic-password -a skopnix -s "$1" -w; }

PROJECT_ID="prj_hUn3cMaYXtebDMo7q9UzGM5p7qaq"
TEAM_ID="team_D1O9GL73MT8chfxQEFh0cHfk"
API="https://api.vercel.com"

TOKEN="$(kc skopnix-vercel-token)"
AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

set_env() {
  local key="$1" val="$2" code
  code=$(python3 -c '
import json,sys
print(json.dumps({"key":sys.argv[1],"value":sys.argv[2],"type":"encrypted",
                  "target":["production","preview","development"]}))' "$key" "$val" \
    | curl -s -o /tmp/venv_out.json -w '%{http_code}' -X POST \
        "${API}/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}&upsert=true" \
        "${AUTH[@]}" --data-binary @-)
  if [[ "$code" == "200" || "$code" == "201" ]]; then
    echo "  ✓ ${key} set (production, preview, development)"
  else
    echo "  ✗ ${key} failed (HTTP ${code}):"; cat /tmp/venv_out.json; echo; exit 1
  fi
}

echo "[1/4] setting environment variables"
set_env MONGO_URI_WRITE "$(kc skopnix-mongo-write-uri)"
set_env ADMIN_TOKEN     "$(kc skopnix-admin-token)"

echo "[2/4] redeploying production (env vars are baked in at build time)"
PREV=$(curl -s "${API}/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&target=production&state=READY&limit=1" \
        "${AUTH[@]}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["deployments"][0]["uid"])')
NEW=$(python3 -c '
import json,sys
print(json.dumps({"name":"ctiaze-web","deploymentId":sys.argv[1],"target":"production",
                  "meta":{"action":"redeploy-waitlist-fix"}}))' "$PREV" \
      | curl -s -X POST "${API}/v13/deployments?teamId=${TEAM_ID}&forceNew=1" \
          "${AUTH[@]}" --data-binary @- \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("id") or d)')
echo "  → deployment ${NEW} (from ${PREV})"

echo "[3/4] waiting for READY"
for _ in $(seq 1 60); do
  ST=$(curl -s "${API}/v13/deployments/${NEW}?teamId=${TEAM_ID}" "${AUTH[@]}" \
       | python3 -c 'import json,sys; print(json.load(sys.stdin).get("readyState",""))')
  echo "  state: ${ST}"
  [[ "$ST" == "READY" ]] && break
  [[ "$ST" == "ERROR" || "$ST" == "CANCELED" ]] && { echo "  ✗ build ${ST}"; exit 1; }
  sleep 10
done

echo "[4/4] verifying a real signup end-to-end"
node "$(dirname "$0")/verify-waitlist.mjs"
