// === PARSER ===
// Prisma 스키마 파싱 & 생성

function parse(text) {
  const models = [], enums = [], lines = text.split('\n'); let cur = null, bd = 0;
  for (const raw of lines) {
    const tr = raw.trim();
    if (tr.startsWith('//') && !cur) continue; if (!tr && !cur) continue;
    if (/^(datasource|generator)\s+/.test(tr)) { cur = { type: '_s' }; bd = 0; if (tr.includes('{')) bd++; continue; }
    if (cur && cur.type === '_s') { if (tr.includes('{')) bd++; if (tr.includes('}')) bd--; if (bd <= 0) cur = null; continue; }
    const mm = tr.match(/^model\s+(\w+)\s*\{/); if (mm) { cur = { type: 'model', name: mm[1], fields: [], mapName: null, indexes: [] }; continue; }
    const em = tr.match(/^enum\s+(\w+)\s*\{/); if (em) { cur = { type: 'enum', name: em[1], values: [] }; continue; }
    if (tr === '}' && cur) { if (cur.type === 'model') models.push(cur); if (cur.type === 'enum') enums.push(cur); cur = null; continue; }
    if (!cur) continue;
    if (cur.type === 'enum') { if (tr && !tr.startsWith('//')) { const val = tr.replace(/\/\/.*$/, '').trim(); if (val) cur.values.push(val); } continue; }
    if (cur.type === 'model') {
      if (tr.match(/@@map\("(.+?)"\)/)) { cur.mapName = RegExp.$1; continue; }
      if (tr.startsWith('@@')) { cur.indexes.push(tr); continue; }
      if (tr.startsWith('//')) continue;
      const fm = tr.match(/^(\w+)\s+(\S+)(.*)/); if (!fm) continue;
      let fn = fm[1], ft = fm[2], rest = fm[3] || '';
      const isOpt = ft.endsWith('?'), isArr = ft.endsWith('[]');
      if (isOpt) ft = ft.slice(0, -1); if (isArr) ft = ft.slice(0, -2);
      const attrs = []; const rx = /@(\w+)/g; let m;
      while ((m = rx.exec(rest)) !== null) {
        const nm = m[1]; const si = m.index + m[0].length;
        if (rest[si] === '(') {
          let dep = 1, j = si + 1, arg = '(';
          while (j < rest.length && dep > 0) { if (rest[j] === '(') dep++; else if (rest[j] === ')') dep--; arg += rest[j]; j++; }
          attrs.push({ name: nm, args: arg }); rx.lastIndex = j;
        } else { attrs.push({ name: nm, args: '' }); }
      }
      const cm = rest.match(/\/\/\s*(.*)/);
      cur.fields.push({ name: fn, type: ft, isOptional: isOpt, isArray: isArr, isId: attrs.some(a => a.name === 'id'), isUnique: attrs.some(a => a.name === 'unique'), attrs, hasRelation: attrs.some(a => a.name === 'relation'), defaultValue: (attrs.find(a => a.name === 'default') || {}).args || null, comment: cm ? cm[1] : '' });
    }
  }
  return { models, enums };
}

function gen(s) {
  let o = 'datasource db {\n  provider = "postgresql"\n}\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n\n';
  for (const e of s.enums) { o += `enum ${e.name} {\n`; for (const v of e.values) o += `  ${v}\n`; o += '}\n\n'; }
  for (const m of s.models) { o += `model ${m.name} {\n`; for (const f of m.fields) { let l = `  ${f.name}`.padEnd(26); l += f.type + (f.isArray ? '[]' : '') + (f.isOptional ? '?' : ''); for (const a of f.attrs) l += ` @${a.name}${a.args}`; if (f.comment) l += ` // ${f.comment}`; o += l + '\n'; } for (const x of (m.indexes || [])) o += `\n  ${x}`; if (m.mapName) o += `\n  @@map("${m.mapName}")`; o += '\n}\n\n'; }
  return o.trim() + '\n';
}
