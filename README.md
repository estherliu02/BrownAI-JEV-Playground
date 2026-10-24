# BrownAI-JEV-Playground

A fully static version of the supplied live Interview Segments Playground. The original two panels, question history, table, filters, sorting and reset workflow are preserved. UI styling has been refined without adding dashboard modules.

## Run

Double-click `index.html`. No installation, build, server, API key or internet connection is required. Alternatively run `python3 -m http.server 8000` in this folder and open http://localhost:8000. Upload the whole folder to any static host (including GitHub Pages).

## Demo workflow

1. Choose Noul, Score or Choice, then one of the 10 fixed questions.
2. Read the locked instruction and its original options/rubric.
3. Apply to Current Rows to reveal saved results for those rows.
4. Filter any source or applied column, combine filters, remove individual filters, and sort by one or more levels in the Sort panel (each Apply adds a level; later levels break ties in earlier ones, blanks always last; re-applying a sorted column changes its direction; drag a sort chip, or focus it and press ←/→, to change its priority). Clicking a header sorts by that column alone. Filters combine with AND. For == and != on columns with a short list of text values (Question, Choice answers), the value is picked from a dropdown; otherwise it is typed, and Enter also applies the filter.
5. Apply another question to the filtered rows. Unapplied rows have blank results and do not match filters on those results. Reapplying a question adds results to its existing column rather than duplicating it. In the applied-question list, × removes a question (and filters/sort levels on its columns); drag an entry, or focus it and press ↑/↓, to reorder its table columns.
6. Save as Excel exports the visible rows in their current sort order, applied columns and question metadata as a genuine `.xlsx` workbook. Reset removes applied columns and filters/sorting referencing those columns; source-column filters remain. Clear Filters shows all rows again. Refresh starts a new session.

## Data and provenance

`data/source.xlsx` is an unchanged copy of the supplied table_20261024_2133(1).xlsx: 133 segments, six Noul questions, three Choice questions (with confidence), and one Score question. Question wording, criteria, participant text, segment identifiers and numeric results are preserved exactly. All answers are saved workbook results, **not new predictions**. Display rounds non-integer numbers to two decimals, as in the live app; filtering and export retain source precision.

The demo initially shows the three source columns; saved analysis columns are revealed through Apply. Noul is a numeric saved value, not a newly calculated yes/no label. The application makes no network requests. A Content Security Policy also disables connections. No raw transcripts, `.env`, credentials, backend or virtual environment are included.

## Files

- `index.html`: original page layout adapted to preset-only use.
- `assets/styles.css`: responsive visual styling.
- `assets/app.js`: local apply/filter/sort/reset behavior.
- `assets/data.js`: bundled source rows, question definitions and saved answers; a classic script supports `file://` opening.
- `assets/export.js`: dependency-free XLSX download.
- `data/source.xlsx`: authoritative supplied data.
- `scripts/build_data.py`: maintainer-only data rebuild (`python3 -m pip install -r requirements-dev.txt`, then `python3 scripts/build_data.py`). Requires the same Table and Questions sheet schema and exactly 10 questions. No dependency is needed for viewing the demo.

To change presets or results, edit the source workbook and regenerate the bundled data. Visitors cannot create arbitrary questions. All data is client-visible by design.
