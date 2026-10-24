"""Rebuild the static payload from the two sheets of the source workbook."""
from pathlib import Path
import json
import openpyxl
ROOT = Path(__file__).resolve().parents[1]
w = openpyxl.load_workbook(ROOT / 'data/source.xlsx', data_only=True)
table = list(w['Table'].values)
headers = table[0]
source = [dict(zip(headers, r)) for r in table[1:] if any(v is not None for v in r)]
questions = []
for name, kind, instruction, criteria, model, count in list(w['Questions'].values)[1:]:
    answers = {}
    for i, row in enumerate(source):
        answers[str(i)] = {kind: row[name]}
        if kind == 'choice': answers[str(i)]['confidence'] = row[name + ' Confidence']
    questions.append(dict(column_name=name, type=kind, instruction=instruction, criteria=(criteria or '').splitlines(), model=model, answers=answers))
assert len(questions) == 10, 'Exactly 10 preset questions are required'
assert len({r['Segment ID'] for r in source}) == len(source), 'Duplicate segment IDs'
columns = ['Segment ID', 'Question', 'Participant Text']
data = dict(columns=columns, rows=[dict(id=i, **{k:r[k] for k in ['#']+columns}) for i,r in enumerate(source)], questions=questions)
(ROOT/'assets/data.js').write_text('const DEMO = '+json.dumps(data, ensure_ascii=False, allow_nan=False)+';\n', encoding='utf-8')
print(f'Built {len(source)} rows and {len(questions)} presets.')
