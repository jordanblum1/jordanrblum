#!/usr/bin/env bash

set -euo pipefail

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

if [[ -n ${CHROME_FIXTURE_LAUNCH_MARKER:-} ]]; then
  printf 'launched\n' >"$CHROME_FIXTURE_LAUNCH_MARKER"
fi
for argument in "$@"; do
  case "$argument" in
    --user-data-dir=*) profile=${argument#--user-data-dir=} ;;
  esac
done
: "${profile:?missing Chrome profile}"

printf '9222\n/devtools/browser/fixture\n' >"$profile/DevToolsActivePort"
if [[ ${CHROME_FIXTURE_MODE:-} == inspection-failure ]]; then
  trap '' TERM
  sleep 7
  exit 0
fi
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
    LIGHTHOUSE_FIXTURE_STATUS=${LIGHTHOUSE_FIXTURE_OVERRIDE_STATUS:-$expected_status} \
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

test_profile_creation_failure() {
  local launch_marker=$fixture_root/unexpected-chrome-launch
  local status=0

  RUNNER_TEMP=$fixture_root/missing/runner-temp \
    CHROME_PATH=$fixture_root/fake-chrome \
    CHROME_FIXTURE_LAUNCH_MARKER=$launch_marker \
    "$repo_root/scripts/ci/run-lighthouse.sh" "$fixture_root/fake-lighthouse" \
    >"$fixture_root/mktemp-failure.log" 2>&1 || status=$?

  if (( status == 0 )); then
    echo "missing runner temp did not fail profile creation" >&2
    return 1
  fi
  if [[ -e $launch_marker ]]; then
    echo "Chrome launched without an owned profile" >&2
    return 1
  fi
  if find "$fixture_root" -type d -name 'lighthouse.*' -print -quit | grep -q .; then
    echo "Chrome profile was created outside the requested runner temp" >&2
    return 1
  fi
}

test_inspection_failure_is_bounded() {
  local runner_temp=$fixture_root/inspection-failure
  local started_at=$SECONDS
  local status=0
  mkdir -p "$runner_temp" "$fixture_root/failing-path"
  printf '#!/usr/bin/env bash\nexit 9\n' >"$fixture_root/failing-path/ps"
  chmod +x "$fixture_root/failing-path/ps"

  PATH="$fixture_root/failing-path:$PATH" \
    RUNNER_TEMP=$runner_temp \
    CHROME_PATH=$fixture_root/fake-chrome \
    CHROME_FIXTURE_MODE=inspection-failure \
    "$repo_root/scripts/ci/run-lighthouse.sh" "$fixture_root/fake-lighthouse" \
    >"$fixture_root/inspection-failure.log" 2>&1 || status=$?

  if (( status == 0 )); then
    echo "process-table inspection failure did not fail cleanup" >&2
    return 1
  fi
  if (( SECONDS - started_at >= 3 )); then
    echo "process-table inspection failure waited on the live Chrome parent" >&2
    return 1
  fi
  if ! find "$runner_temp" -mindepth 1 -maxdepth 1 -type d -name 'lighthouse.*' -print -quit | grep -q .; then
    echo "unconfirmed cleanup removed the owned Chrome profile" >&2
    return 1
  fi
}

run_case 0 || exit 1
run_case 23 || exit 1
if LIGHTHOUSE_FIXTURE_OVERRIDE_STATUS=99 run_case 0 2>"$fixture_root/status-mismatch.log"; then
  echo "fixture accepted an unexpected Lighthouse exit status" >&2
  exit 1
fi
test_profile_creation_failure || exit 1
test_inspection_failure_is_bounded || exit 1
echo "Lighthouse process-group cleanup fixtures passed"
