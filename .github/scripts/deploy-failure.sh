#!/usr/bin/env bash
set -euo pipefail
label="deploy-failure"
job_line='^- `([^`]+)`$'
failed="$(jq --raw-output 'to_entries | map(select(.value.result == "failure") | "- `\(.key)`") | join("\n")' <<<"$NEEDS")"
body="$(printf 'main の verify で、次のジョブが失敗した。\n\n%s\n\n- 実行: %s\n- コミット: %s\n' "$failed" "$RUN_URL" "$GITHUB_SHA")"
number="$(gh issue list --repo "$GITHUB_REPOSITORY" --label "$label" --state open --limit 1 --json number --jq '.[0].number // empty')"
if [ -n "$failed" ]; then
  gh label create "$label" --repo "$GITHUB_REPOSITORY" --color B60205 --description "main のデプロイが失敗した" --force
  if [ -n "$number" ]; then
    gh issue comment "$number" --repo "$GITHUB_REPOSITORY" --body "$body"
  else
    gh issue create --repo "$GITHUB_REPOSITORY" --title "main のデプロイが失敗した" --label "$label" --assignee "$GITHUB_REPOSITORY_OWNER" --body "$body"
  fi
elif [ -n "$number" ]; then
  reported="$(gh issue view "$number" --repo "$GITHUB_REPOSITORY" --json body,comments --jq '[.body, .comments[].body] | join("\n")' | sed -nE "s/$job_line/\\1/p" | sort -u)"
  pending="$(jq --raw-output --arg reported "$reported" '. as $needs | [($reported | split("\n"))[] | select(. != "" and $needs[.].result != "success")] | join(" ")' <<<"$NEEDS")"
  if [ -z "$pending" ]; then
    gh issue close "$number" --repo "$GITHUB_REPOSITORY" --reason completed --comment "$(printf '失敗したジョブがすべて main で通った。\n\n- 実行: %s\n- コミット: %s\n' "$RUN_URL" "$GITHUB_SHA")"
  fi
fi
