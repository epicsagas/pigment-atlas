#!/usr/bin/env bash
# Regenerate exports/ from docs/. Needs pandoc; PDF is printed from the HTML by headless Chrome.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p exports

report=(docs/01-research-report.md docs/02-timeline.md docs/03-technique-analysis.md docs/06-scene-catalog.md docs/sources.md)
css=scripts/print.css

pandoc "${report[@]}" -s --toc --embed-resources --css "$css" -o exports/refik-anadol-research.html
pandoc "${report[@]}" -s --toc -o exports/refik-anadol-research.docx
pandoc "${report[@]}" -s --toc -o exports/refik-anadol-research.epub
pandoc docs/04-presentation.md -s -o exports/refik-anadol-presentation.pptx

chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ -x "$chrome" ]]; then
	"$chrome" --headless --disable-gpu --no-pdf-header-footer \
		--print-to-pdf="$PWD/exports/refik-anadol-research.pdf" "file://$PWD/exports/refik-anadol-research.html" 2>/dev/null
fi

ls -la exports
