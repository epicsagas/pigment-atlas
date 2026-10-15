#!/usr/bin/env bash
# Regenerate exports/ (Korean) and exports/en/ (English) from docs/. Needs pandoc; PDF is printed from the HTML by headless Chrome.
set -euo pipefail
cd "$(dirname "$0")/.."

css=scripts/print.css
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
names=(01-research-report 02-timeline 03-technique-analysis 06-scene-catalog sources)

# Language-switch links point between Markdown files and break inside exports, so drop them from temp copies.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

build() { # $1 = source dir (docs or docs/en), $2 = output dir
	local src=$1 out=$2 files=()
	mkdir -p "$out" "$tmp/$src"
	for n in "${names[@]}" 04-presentation; do
		grep -v -E '^(\*\*한국어\*\* \| \[English\]|\[한국어\]\(.*\) \| \*\*English\*\*)' "$src/$n.md" > "$tmp/$src/$n.md"
	done
	for n in "${names[@]}"; do files+=( "$tmp/$src/$n.md" ); done

	pandoc "${files[@]}" -s --toc --embed-resources --css "$css" -o "$out/refik-anadol-research.html"
	pandoc "${files[@]}" -s --toc -o "$out/refik-anadol-research.docx"
	pandoc "${files[@]}" -s --toc -o "$out/refik-anadol-research.epub"
	pandoc "$tmp/$src/04-presentation.md" -s -o "$out/refik-anadol-presentation.pptx"

	if [[ -x "$chrome" ]]; then
		"$chrome" --headless --disable-gpu --no-pdf-header-footer \
			--print-to-pdf="$PWD/$out/refik-anadol-research.pdf" "file://$PWD/$out/refik-anadol-research.html" 2>/dev/null
	fi
}

build docs exports
if [[ -d docs/en ]]; then build docs/en exports/en; fi

ls -la exports exports/en 2>/dev/null
