export function createKeywordDetector(word: string, onMatch: () => void): (key: string) => void {
  const target = word.toLowerCase();
  let buf = '';
  return (key: string) => {
    if (key.length !== 1) return;
    buf = (buf + key.toLowerCase()).slice(-target.length);
    if (buf === target) { onMatch(); buf = ''; }
  };
}
