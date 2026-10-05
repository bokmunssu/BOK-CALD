export function sanitizeMemoHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'SPAN']);
  for (const element of Array.from(doc.body.querySelectorAll('*')).reverse()) {
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(element.tagName)) { element.remove(); continue; }
    if (!allowed.has(element.tagName)) { element.replaceWith(...element.childNodes); continue; }
    for (const attr of Array.from(element.attributes)) element.removeAttribute(attr.name);
  }
  return doc.body.innerHTML;
}
export async function readImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('PNG, JPG, WEBP, GIF 이미지를 선택해 주세요.');
  if (file.size > 5 * 1024 * 1024) throw new Error('이미지는 5MB 이하로 선택해 주세요.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.')); reader.readAsDataURL(file);
  });
}
