"""mock data 일괄 비우기 — type 정의는 보존, MOCK_* export만 빈 배열/객체/문자열로."""
import re
import sys

SRC = 'src/constants/index.ts'

with open(SRC, 'r', encoding='utf-8') as f:
    text = f.read()

i = 0
out = []

def find_matching(s, start, opener, closer):
    depth = 0
    j = start
    while j < len(s):
        c = s[j]
        if c == opener:
            depth += 1
        elif c == closer:
            depth -= 1
            if depth == 0:
                return j + 1
        elif c in ("'", '"', '`'):
            quote = c
            j += 1
            while j < len(s) and s[j] != quote:
                if s[j] == '\\':
                    j += 2
                    continue
                j += 1
        j += 1
    return j

while i < len(text):
    m = re.match(r'export const (MOCK_\w+)((?:\s*:\s*[^=\n]+)?)\s*=\s*', text[i:])
    if m:
        prefix = text[i:i + m.end()]
        after = i + m.end()
        if after >= len(text):
            out.append(text[i:])
            i = len(text)
            continue
        ch = text[after]
        if ch == '[':
            j = find_matching(text, after, '[', ']')
            empty = '[]'
        elif ch == '{':
            j = find_matching(text, after, '{', '}')
            empty = '{}'
        elif ch == '`':
            # template literal
            j = after + 1
            while j < len(text) and text[j] != '`':
                if text[j] == '\\':
                    j += 2
                    continue
                j += 1
            j += 1
            empty = "''"
        elif ch in ("'", '"'):
            quote = ch
            j = after + 1
            while j < len(text) and text[j] != quote:
                if text[j] == '\\':
                    j += 2
                    continue
                j += 1
            j += 1
            empty = "''"
        else:
            # derived expression (e.g. MOCK_CHANNELS.filter(...).map(...))
            # 다음 export 또는 EOF까지 그대로 두고 진행
            next_export = text.find('\nexport ', after)
            if next_export == -1:
                next_export = len(text)
            out.append(text[i:next_export])
            i = next_export
            continue

        # trailing 'as const' 제거
        rest = text[j:]
        trail = re.match(r'\s*as\s+const', rest)
        if trail:
            j += trail.end()
        out.append(prefix + empty)
        i = j
        continue
    out.append(text[i])
    i += 1

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(''.join(out))
print('done')
