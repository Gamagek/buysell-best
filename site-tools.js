(function(){
  "use strict";

  var INSTALL_KEY = "buysellBestInstalled";
  var NOTIFY_KEY = "buysellBestNotify";
  var deferredPrompt = null;

  function byId(id){ return document.getElementById(id); }

  function showToast(message, kind){
    var toast = byId("siteToolsToast");
    if(!toast){
      toast = document.createElement("div");
      toast.id = "siteToolsToast";
      toast.setAttribute("role","status");
      toast.setAttribute("aria-live","polite");
      document.body.appendChild(toast);
    }
    toast.className = "site-tools-toast " + (kind || "");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function(){ toast.hidden = true; }, 5200);
  }

  function updateShortcutButton(){
    var btn = byId("createShortcutBtn");
    if(!btn) return;
    var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if(standalone){
      btn.textContent = "✅ Website Shortcut Active";
      btn.disabled = true;
      btn.classList.add("is-done");
    }else{
      btn.disabled = false;
      btn.classList.remove("is-done");
      btn.textContent = "📲 Create Website Shortcut";
    }
  }

  function updateNotifyButton(){
    var btn = byId("enableNotificationsBtn");
    if(!btn) return;
    if(!("Notification" in window)){
      btn.textContent = "🔔 Alerts Unsupported";
      btn.disabled = true;
      return;
    }
    if(Notification.permission === "granted"){
      btn.textContent = "✅ Browser Alerts Enabled";
      btn.classList.add("is-done");
    }else{
      btn.textContent = "🔔 Enable Browser Alerts";
      btn.classList.remove("is-done");
    }
  }

  async function showRichNotification(){
    var registration = await navigator.serviceWorker.ready;
    await registration.showNotification("BuySell.Best 🔔", {
      body: "Browser alerts are enabled. You can now receive rich BuySell.Best notifications.",
      icon: "/icons/buysell-192.svg",
      badge: "/icons/buysell-192.svg",
      tag: "buysell-best-welcome",
      renotify: true,
      timestamp: Date.now(),
      vibrate: [120, 60, 120],
      data: { url: "/" },
      actions: [
        { action: "open", title: "Open BuySell.Best" },
        { action: "close", title: "Dismiss" }
      ]
    });
  }

  async function enableNotifications(){
    if(!("Notification" in window)){
      showToast("This browser does not support website notifications.", "error");
      return;
    }

    var permission = Notification.permission;
    if(permission === "default"){
      permission = await Notification.requestPermission();
    }

    updateNotifyButton();

    if(permission !== "granted"){
      showToast("Browser alerts were not enabled. You can allow notifications in this site's browser settings.", "error");
      return;
    }

    try{
      if("serviceWorker" in navigator){
        await showRichNotification();
      }else{
        new Notification("BuySell.Best 🔔", { body: "Browser alerts are enabled." });
      }
      localStorage.setItem(NOTIFY_KEY, "granted");
      showToast("Browser alerts are enabled for BuySell.Best.", "success");
    }catch(error){
      console.error("[BuySell.Best notifications]", error);
      showToast("Notifications are allowed, but this browser could not display the test alert.", "error");
    }
  }

  async function installShortcut(){
    if(window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true){
      showToast("BuySell.Best is already running as a website shortcut.", "success");
      return;
    }

    if(deferredPrompt){
      deferredPrompt.prompt();
      var result = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if(result && result.outcome === "accepted"){
        localStorage.setItem(INSTALL_KEY, "accepted");
        showToast("BuySell.Best shortcut created.", "success");
      }else{
        showToast("Shortcut setup was cancelled.", "");
      }
      updateShortcutButton();
      return;
    }

    showToast("Use your browser's menu and choose “Add to Home screen”, “Install app”, or “Create shortcut”.", "");
  }

  function registerServiceWorker(){
    if(!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function(error){
      console.warn("[BuySell.Best] Service worker registration failed", error);
    });
  }

  function init(){
    var shortcut = byId("createShortcutBtn");
    var notify = byId("enableNotificationsBtn");
    if(shortcut) shortcut.addEventListener("click", installShortcut);
    if(notify) notify.addEventListener("click", enableNotifications);

    window.addEventListener("beforeinstallprompt", function(event){
      event.preventDefault();
      deferredPrompt = event;
      updateShortcutButton();
    });

    window.addEventListener("appinstalled", function(){
      localStorage.setItem(INSTALL_KEY, "installed");
      updateShortcutButton();
      showToast("BuySell.Best shortcut installed successfully.", "success");
    });

    updateShortcutButton();
    updateNotifyButton();
    registerServiceWorker();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init, { once:true });
  }else{
    init();
  }
})();