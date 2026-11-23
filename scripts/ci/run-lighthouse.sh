#!/usr/bin/env bash

set -uo pipefail

if (( $# == 0 )); then
  echo "usage: $0 <lighthouse command> [arguments...]" >&2
  exit 2
fi

: "${CHROME_PATH:?CHROME_PATH must point to a Chrome executable}"

runner_temp=${RUNNER_TEMP:-${TMPDIR:-/tmp}}
profile=
if ! profile=$(mktemp -d "$runner_temp/lighthouse.XXXXXX"); then
  echo "Could not create an owned Chrome profile in $runner_temp" >&2
  exit 1
fi
if [[ -z $profile || ! -d $profile ]]; then
  echo "mktemp did not return an owned Chrome profile directory" >&2
  exit 1
fi
chrome_pid=

group_has_live_processes() {
  local group_id=$1
  local process_stats
  local process_state
  local process_group
  local stat_file

  if command -v ps >/dev/null 2>&1; then
    process_stats=$(ps -axo pgid=,stat=) || return 2
    awk -v group_id="$group_id" '
      $1 == group_id && $2 !~ /^Z/ { found = 1 }
      END { exit(found ? 0 : 1) }
    ' <<<"$process_stats"
    return
  fi

  if [[ -d /proc/self ]]; then
    for stat_file in /proc/[0-9]*/stat; do
      [[ -r $stat_file ]] || continue
      process_stats=$(<"$stat_file") || continue
      process_stats=${process_stats##*) }
      read -r process_state _ process_group _ <<<"$process_stats"
      if [[ $process_group == "$group_id" && $process_state != Z ]]; then
        return 0
      fi
    done
    return 1
  fi

  return 2
}

wait_for_group_to_stop() {
  local group_id=$1
  local attempts=$2
  local attempt
  local group_status

  for (( attempt = 0; attempt < attempts; attempt++ )); do
    group_status=0
    group_has_live_processes "$group_id" || group_status=$?
    (( group_status == 1 )) && return 0
    (( group_status > 1 )) && return 1
    sleep 0.1
  done

  group_status=0
  group_has_live_processes "$group_id" || group_status=$?
  (( group_status == 1 ))
}

stop_chrome_group() {
  local group_id=$1
  local group_status=0

  group_has_live_processes "$group_id" || group_status=$?
  (( group_status == 1 )) && return 0
  if (( group_status > 1 )); then
    kill -TERM -- "-$group_id" 2>/dev/null || true
    sleep 0.1
    kill -KILL -- "-$group_id" 2>/dev/null || true
    return 1
  fi

  kill -TERM -- "-$group_id" 2>/dev/null || true
  if wait_for_group_to_stop "$group_id" 30; then
    return 0
  fi

  kill -KILL -- "-$group_id" 2>/dev/null || true
  wait_for_group_to_stop "$group_id" 20
}

cleanup() {
  local command_status=$?
  local cleanup_status=0
  trap - EXIT INT TERM

  if [[ -n $chrome_pid ]]; then
    if stop_chrome_group "$chrome_pid"; then
      wait "$chrome_pid" 2>/dev/null || true
    else
      echo "Chrome process group $chrome_pid did not stop; keeping $profile for safe diagnosis" >&2
      cleanup_status=1
    fi
  fi

  if (( cleanup_status == 0 )); then
    rm -rf -- "$profile" || cleanup_status=1
  fi

  if (( command_status != 0 )); then
    exit "$command_status"
  fi
  exit "$cleanup_status"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

chrome_arguments=(
  --headless
  --remote-debugging-port=0
  "--user-data-dir=$profile"
  about:blank
)

if command -v setsid >/dev/null 2>&1; then
  setsid "$CHROME_PATH" "${chrome_arguments[@]}" >"$profile/chrome.log" 2>&1 &
else
  python3 -c 'import os, sys; os.setsid(); os.execv(sys.argv[1], sys.argv[1:])' \
    "$CHROME_PATH" "${chrome_arguments[@]}" >"$profile/chrome.log" 2>&1 &
fi
chrome_pid=$!

for attempt in {1..50}; do
  if [[ -s $profile/DevToolsActivePort ]]; then
    break
  fi
  if ! kill -0 "$chrome_pid" 2>/dev/null; then
    break
  fi
  sleep 0.2
done

if [[ ! -s $profile/DevToolsActivePort ]]; then
  cat "$profile/chrome.log"
  exit 1
fi

port=$(head -n 1 "$profile/DevToolsActivePort")
"$@" "--collect.settings.port=$port"
