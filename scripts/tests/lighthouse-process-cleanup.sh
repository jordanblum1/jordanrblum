#!/usr/bin/env bash

set -uo pipefail

repo_root=$(cd "$(dirname "$0")/../.." && pwd)
fixture_root=$(mktemp -d "${TMPDIR:-/tmp}/lighthouse-cleanup-test.XXXXXX")
unrelated_pid=

cleanup_fixture() {
  local status=$?
  trap - EXIT
  if [[ -n $unrelated_pid ]]; then
    kill "$unrelated_pid" 2>/dev/null || true
    wait "$unrelated_pid" 2>/dev/null || true
  fi
  rm -rf -- "$fixture_root"
  exit "$status"
}
trap cleanup_fixture EXIT

cat >"$fixture_root/fake-chrome" <<'CHROME'
#!/usr/bin/env bash
set -u

for argument in "$@"; do
  case "$argument" in
    --user-data-dir=*) profile=${argument#--user-data-dir=} ;;
  esac
done
: "${profile:?missing Chrome profile}"

printf '9222\n/devtools/browser/fixture\n' >"$profile/DevToolsActivePort"
(
  trap '' TERM
  while :; do
    printf 'writing\n' >>"$profile/child-writer.log"
    sleep 0.02
  done
) &
writer_pid=$!
printf '%s\n' "$writer_pid" >"$profile/child-writer.pid"
trap 'exit 0' TERM
wait "$writer_pid"
CHROME

cat >"$fixture_root/fake-lighthouse" <<'LIGHTHOUSE'
#!/usr/bin/env bash
exit "${LIGHTHOUSE_FIXTURE_STATUS:-0}"
LIGHTHOUSE
chmod +x "$fixture_root/fake-chrome" "$fixture_root/fake-lighthouse"

sleep 30 &
unrelated_pid=$!

run_case() {
  local expected_status=$1
  local runner_temp=$fixture_root/run-$expected_status
  local status=0
  mkdir -p "$runner_temp"

  RUNNER_TEMP=$runner_temp \
    CHROME_PATH=$fixture_root/fake-chrome \
    LIGHTHOUSE_FIXTURE_STATUS=$expected_status \
    "$repo_root/scripts/ci/run-lighthouse.sh" "$fixture_root/fake-lighthouse" || status=$?

  if (( status != expected_status )); then
    echo "expected Lighthouse status $expected_status, received $status" >&2
    return 1
  fi
  if find "$runner_temp" -mindepth 1 -print -quit | grep -q .; then
    echo "owned Chrome profile survived cleanup for status $expected_status" >&2
    return 1
  fi
  if ! kill -0 "$unrelated_pid" 2>/dev/null; then
    echo "cleanup stopped a process outside the owned Chrome group" >&2
    return 1
  fi
}

run_case 0
run_case 23
echo "Lighthouse process-group cleanup fixtures passed"
