(function(){
  "use strict";
  var timer = null;

  function esc(value){
    return String(value ?? "").replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c];
    });
  }

  function formatExpiry(value){
    var d = new Date(value);
    if(Number.isNaN(d.getTime())) return "";
    return d.toLocaleString([], {year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
  }

  function startCountdown(card, expiry){
    var end = new Date(expiry).getTime();
    if(!Number.isFinite(end)) return;
    function tick(){
      var left = Math.max(0, end - Date.now());
      var hours = Math.floor(left / 3600000);
      var mins = Math.floor((left % 3600000) / 60000);
      var text = left <= 0 ? "Expired" : "Ends in " + hours + "h " + mins + "m";
      var el = card.querySelector("[data-countdown]");
      if(el) el.textContent = text;
    }
    tick();
    window.setInterval(tick, 60000);
  }

  function render(items, syncedAt){
    var root = document.getElementById("promoWall");
    if(!root) return;
    if(!items.length){
      root.innerHTML = '<div class="promo-empty">No verified promo codes are available right now. New source data will appear after the next sync.</div>';
      return;
    }

    root.innerHTML = '<div class="promo-wall-head"><div><div class="eyebrow">LIVE PROMO RADAR</div><h2>Promo codes, coupons &amp; vouchers</h2><p>Verified source offers are refreshed automatically every 6 hours. Expired codes are removed from the active list.</p></div><span class="promo-sync-note">'+esc(syncedAt ? "Last source update: " + formatExpiry(syncedAt) : "Checking source feeds…")+'</span></div>' +
      '<div class="promo-grid">' + items.map(function(item){
        var code = item.code ? '<div class="promo-code-row"><code>'+esc(item.code)+'</code><button type="button" class="promo-copy" data-copy-code="'+esc(item.code)+'">Copy</button></div>' : '<div class="promo-voucher-label">Voucher / offer</div>';
        var terms = item.terms ? '<details><summary>Terms</summary><p>'+esc(item.terms)+'</p></details>' : "";
        return '<article class="promo-card" data-expiry="'+esc(item.expiresAt || "")">' +
          '<div class="promo-top"><span class="promo-store">'+esc(item.store)+'</span><span class="promo-type">'+esc(item.promoType || "deal")+'</span></div>' +
          '<h3>'+esc(item.title)+'</h3>' +
          (item.valueText ? '<div class="promo-value">'+esc(item.valueText)+'</div>' : "") +
          code +
          '<div class="promo-meta"><span data-countdown>Checking expiry…</span>'+(item.expiresAt ? '<span>Until '+esc(formatExpiry(item.expiresAt))+'</span>' : "")+'</div>' +
          terms +
          '<a class="promo-open" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">Open source ↗</a>' +
        '</article>';
      }).join("") + '</div>';

    root.querySelectorAll("[data-countdown]").forEach(function(el){
      var card = el.closest(".promo-card");
      startCountdown(card, card.getAttribute("data-expiry"));
    });

    root.querySelectorAll("[data-copy-code]").forEach(function(btn){
      btn.addEventListener("click",function(){
        var code = btn.getAttribute("data-copy-code") || "";
        if(!code) return;
        var done = function(){ btn.textContent = "Copied ✓"; window.setTimeout(function(){btn.textContent="Copy";},1800); };
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(code).then(done).catch(function(){});
        } else {
          var input = document.createElement("input");
          input.value = code;
          document.body.appendChild(input);
          input.select();
          try { document.execCommand("copy"); done(); } catch(_){}
          input.remove();
        }
      });
    });
  }

  function load(){
    fetch("/api/promos?limit=12",{cache:"no-store"})
      .then(function(r){ return r.json(); })
      .then(function(data){ render(data.items || [], data.syncedAt || null); })
      .catch(function(){
        var root=document.getElementById("promoWall");
        if(root) root.innerHTML='<div class="promo-empty">Promo radar is temporarily unavailable.</div>';
      });
  }

  function init(){
    load();
    clearInterval(timer);
    timer = window.setInterval(load, 10 * 60 * 1000);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();