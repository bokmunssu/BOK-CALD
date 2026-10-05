import { expect, it } from 'vitest';
import { sanitizeMemoHtml } from '../memo';
it('keeps note formatting while removing scripts, navigation and event attributes', () => {
  const result = sanitizeMemoHtml('<b onclick="bad()">메모</b><script>bad()</script><a href="https://evil">링크</a><img src=x onerror="bad()"><i>글</i>');
  expect(result).toBe('<b>메모</b>링크<i>글</i>');
});
