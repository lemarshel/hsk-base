(function(){
  const overlay = document.getElementById("news-overlay");
  const card = document.getElementById("news-card");
  if (!overlay || !card) return;

  let openState = false;

  function isOpen(){
    return overlay.style.display && overlay.style.display !== "none";
  }

  function getRoom(){
    return card.dataset.room || "";
  }

  function onChange(){
    const nowOpen = isOpen();
    if (nowOpen === openState) return;
    openState = nowOpen;
    if (nowOpen) {
      const room = getRoom();
      if (room) {
        chrome.runtime.sendMessage({ type: "news_open", room });
      }
    } else {
      chrome.runtime.sendMessage({ type: "news_close" });
    }
  }

  const obs = new MutationObserver(onChange);
  obs.observe(overlay, { attributes: true, attributeFilter: ["style", "class"] });

  const cardObs = new MutationObserver(() => {
    if (isOpen()) {
      const room = getRoom();
      if (room) {
        chrome.runtime.sendMessage({ type: "news_open", room });
      }
    }
  });
  cardObs.observe(card, { attributes: true, attributeFilter: ["data-room"] });
})();
