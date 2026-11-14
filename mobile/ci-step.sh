#!/usr/bin/env bash
# Runs one CI step; on failure turns the end of its output into a GitHub annotation,
# so the reason is visible on the commit's check run (without opening the logs).
name="$1"; shift
log=$(mktemp)
if ! bash -c "$*" >"$log" 2>&1; then
  cat "$log"
  msg=$(tail -c 3500 "$log" | sed 's/%/%25/g' | sed ':a;N;$!ba;s/\n/%0A/g')
  echo "::error title=${name} failed::${msg}"
  exit 1
fi
cat "$log"
