# CLI snapshot tests for learnvis
# Usage: bash testdata/run.sh

set -e
CLI="npx tsx cli.ts"
OUT="/tmp/learnvis-test"

echo "=== CLI Snapshot Tests ==="

for file in testdata/*.json; do
  base=$(basename "$file" .json)
  echo -n "  $base ... "
  $CLI --svg < "$file" > "$OUT-$base.svg" 2>/dev/null
  if grep -q '<svg' "$OUT-$base.svg"; then
    echo "OK ($(wc -c < "$OUT-$base.svg") bytes)"
  else
    echo "FAIL (no svg output)"
    exit 1
  fi
done

echo "=== All CLI tests passed ==="
