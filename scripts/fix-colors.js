const fs = require('fs');

const replacements = [
  // Background colors - be careful with rgba patterns
  { pattern: /background:\s*'#[0-9A-Fa-f]{6}'/g, replace: (match) => {
    const color = match.match(/#[0-9A-Fa-f]{6}/)[0];
    const map = {
      '#0F172A': 'var(--bg-primary)',
      '#1E293B': 'var(--bg-secondary)',
    };
    return map[color] || match;
  }},
  // Text colors
  { pattern: /color:\s*'#[0-9A-Fa-f]{6}'/g, replace: (match) => {
    const color = match.match(/#[0-9A-Fa-f]{6}/)[0];
    const map = {
      '#06B6D4': 'var(--accent)',
      '#94A3B8': 'var(--text-secondary)',
      '#E2E8F0': 'var(--text-primary)',
      '#64748B': 'var(--text-muted)',
      '#475569': 'var(--text-muted)',
      '#F59E0B': 'var(--warning)',
      '#EF4444': 'var(--danger)',
      '#10B981': 'var(--success)',
      '#3B82F6': 'var(--blue)',
    };
    return map[color] || match;
  }},
  // Border colors
  { pattern: /border:\s*'1px solid rgba\(6,\s*182,\s*212/g, replace: "border: '1px solid var(--accent-border)" },
  { pattern: /border:\s*"1px solid rgba\(6,\s*182,\s*212/g, replace: 'border: "1px solid var(--accent-border)"' },
  // Box shadows
  { pattern: /boxShadow:\s*'0 4px 12px rgba\(0,\s*0,\s*0,\s*0\.3\)'/g, replace: "boxShadow: '0 4px 12px var(--shadow)'" },
  { pattern: /boxShadow:\s*"0 4px 12px rgba\(0,\s*0,\s*0,\s*0\.3\)"/g, replace: '"boxShadow: "0 4px 12px var(--shadow)"' },
];

const files = process.argv.slice(2);

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log('File not found:', file);
    return;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  replacements.forEach(({ pattern, replace }) => {
    const newContent = content.replace(pattern, typeof replace === 'function' ? replace : replace);
    if (newContent !== content) {
      changed = true;
      content = newContent;
    }
  });
  
  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated:', file);
  } else {
    console.log('No changes:', file);
  }
});
