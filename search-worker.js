/* HSK Base — search worker (off-main-thread filtering) */
var _rows = [];

function stripTones(s){
  try{
    return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }catch(e){
    return String(s||'').toLowerCase();
  }
}

function prepRow(r){
  var zh = String(r.zh || '').trim();
  var py = String(r.py || '').trim();
  var en = String(r.en || '').trim();
  var ru = String(r.ru || '').trim();
  return {
    zh: zh.toLowerCase(),
    py: stripTones(py),
    en: en.toLowerCase(),
    ru: ru.toLowerCase()
  };
}

function doSearch(query, lang){
  var q = String(query || '').trim();
  if(!q) return [];
  var qn = (lang === 'py') ? stripTones(q) : q.toLowerCase();
  var out = [];
  for(var i=0;i<_rows.length;i++){
    var r = _rows[i];
    if(!r) continue;
    if(lang === 'zh'){
      if(r.zh.indexOf(qn) !== -1) out.push(i);
      continue;
    }
    if(lang === 'py'){
      if(r.py.indexOf(qn) !== -1) out.push(i);
      continue;
    }
    if(lang === 'en'){
      if(r.en.indexOf(qn) !== -1) out.push(i);
      continue;
    }
    // default RU
    if(r.ru.indexOf(qn) !== -1) out.push(i);
  }
  return out;
}

self.onmessage = function(e){
  var data = e.data || {};
  if(data.type === 'init'){
    var rows = data.rows || [];
    _rows = new Array(rows.length);
    for(var i=0;i<rows.length;i++) _rows[i] = prepRow(rows[i]);
    self.postMessage({ type: 'ready' });
    return;
  }
  if(data.type === 'search'){
    var key = data.key || '';
    var matches = doSearch(data.query, data.lang);
    self.postMessage({ type: 'result', key: key, matches: matches });
  }
};
