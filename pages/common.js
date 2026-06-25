window.addEventListener('pageshow',function(e){if(e.persisted){document.querySelectorAll('link[rel=stylesheet]').forEach(function(l){var h=l.href;l.href='';l.href=h;});}});
