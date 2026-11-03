#!/usr/bin/env bash
set -euo pipefail
api="https://api.cloudflare.com/client/v4"
auth=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
site_token="$(sed -n 's/^const CF_BEACON_TOKEN = "\(.*\)";$/\1/p' apps/portfolio/alchemy.run.ts)"
site_tag="$(curl -fsS "${auth[@]}" "$api/accounts/$CLOUDFLARE_ACCOUNT_ID/rum/site_info/list?per_page=100" |
  jq -er --arg token "$site_token" '.result[] | select(.site_token == $token) | .site_tag')"
until="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
since="$(date -u -d "-${REPORT_DAYS:-7} days" +%Y-%m-%dT%H:%M:%SZ)"
site="$(jq -nc --arg tag "$site_tag" --arg since "$since" --arg until "$until" \
  '[{siteTag: $tag}, {datetime_geq: $since, datetime_leq: $until}]')"
page="$(jq -c --arg path "${REPORT_PATH:-}" 'if $path == "" then . else . + [{requestPath: $path}] end' <<<"$site")"
group='count sum { visits }'
filter='RumPageloadEventsAdaptiveGroupsFilter_InputObject'
query="query (\$account: string!, \$site: [$filter!]!, \$page: [$filter!]!) {
  viewer { accounts(filter: { accountTag: \$account }) {
    path: rumPageloadEventsAdaptiveGroups(limit: 100, orderBy: [count_DESC], filter: { AND: \$site }) {
      $group dimensions { label: requestPath } }
    day: rumPageloadEventsAdaptiveGroups(limit: 100, orderBy: [date_ASC], filter: { AND: \$page }) {
      $group dimensions { label: date } }
    referer: rumPageloadEventsAdaptiveGroups(limit: 100, orderBy: [count_DESC], filter: { AND: \$page }) {
      $group dimensions { label: refererHost } }
    country: rumPageloadEventsAdaptiveGroups(limit: 100, orderBy: [count_DESC], filter: { AND: \$page }) {
      $group dimensions { label: countryName } }
  } }
}"
response="$(jq -nc --arg query "$query" --arg account "$CLOUDFLARE_ACCOUNT_ID" \
  --argjson site "$site" --argjson page "$page" \
  '{query: $query, variables: {account: $account, site: $site, page: $page}}' |
  curl -fsS "${auth[@]}" -H "Content-Type: application/json" --data-binary @- "$api/graphql")"
if ! jq -e '.errors == null and .data != null' >/dev/null <<<"$response"; then
  jq -r '.errors[]?.message' <<<"$response" >&2
  exit 1
fi
report="$(
  echo "window	$since	$until	path	${REPORT_PATH:-*}"
  for key in path day referer country; do
    printf '\n%s\tpageviews\tvisits\n' "$key"
    jq -r --arg key "$key" '.data.viewer.accounts[0][$key][]
      | [(.dimensions.label | if . == "" then "(direct)" else . end), .count, .sum.visits] | @tsv' <<<"$response"
  done
)"
echo "$report"
{
  echo '```tsv'
  echo "$report"
  echo '```'
} >>"${GITHUB_STEP_SUMMARY:-/dev/null}"
