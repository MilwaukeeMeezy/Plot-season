window.addEventListener('error',function(e){
  var b=document.getElementById('startup-error'),t=document.getElementById('startup-error-text');
  if(b&&t){
    b.style.display='block';
    var details = e && e.error && (e.error.stack || e.error.message);
    t.textContent = details || [e.message || 'Unknown startup error', e.filename ? ('File: '+e.filename) : '', e.lineno ? ('Line: '+e.lineno+':'+(e.colno||0)) : ''].filter(Boolean).join('\n');
  }
});
window.addEventListener('unhandledrejection',function(e){
  var b=document.getElementById('startup-error'),t=document.getElementById('startup-error-text');
  if(b&&t){
    b.style.display='block';
    var r=e.reason;
    t.textContent=(r && (r.stack||r.message)) || String(r || 'Unhandled promise rejection');
  }
});