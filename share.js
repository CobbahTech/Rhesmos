(function () {
 
  // Custom share icon SVG — three ringed nodes connected by lines with mid-point dots
  const SHARE_ICON = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 40 40"
         fill="none" aria-hidden="true" style="display:inline-block;vertical-align:middle;">
 
      <!-- Left center node: outer ring + inner dot -->
      <circle cx="7"  cy="20" r="6"   stroke="#3DD5C8" stroke-width="2.2" fill="none"/>
      <circle cx="7"  cy="20" r="2.8" fill="#3DD5C8"/>
 
      <!-- Top-right node: outer ring + inner dot -->
      <circle cx="33" cy="7"  r="6"   stroke="#3DD5C8" stroke-width="2.2" fill="none"/>
      <circle cx="33" cy="7"  r="2.8" fill="#3DD5C8"/>
 
      <!-- Bottom-right node: outer ring + inner dot -->
      <circle cx="33" cy="33" r="6"   stroke="#3DD5C8" stroke-width="2.2" fill="none"/>
      <circle cx="33" cy="33" r="2.8" fill="#3DD5C8"/>
 
      <!-- Connecting line: left to top-right -->
      <line x1="13" y1="16.5" x2="27" y2="10"
            stroke="#3DD5C8" stroke-width="2" stroke-linecap="round"/>
 
      <!-- Connecting line: left to bottom-right -->
      <line x1="13" y1="23.5" x2="27" y2="30"
            stroke="#3DD5C8" stroke-width="2" stroke-linecap="round"/>
 
      <!-- Mid-point dot on top line -->
      <circle cx="20" cy="13.2" r="2.2" fill="#3DD5C8"/>
 
      <!-- Mid-point dot on bottom line -->
      <circle cx="20" cy="26.8" r="2.2" fill="#3DD5C8"/>
 
    </svg>
  `;
 
  function addShareButton(postEl) {
    const actions = postEl.querySelector(".post-actions");
    if (!actions || actions.querySelector(".share-btn")) return;
 
    const postId   = postEl.dataset.id;
    const shareBtn = document.createElement("button");
    shareBtn.className   = "share-btn";
    shareBtn.dataset.id  = postId;
    shareBtn.title       = "Share this post";
    shareBtn.innerHTML   = SHARE_ICON;
 
    // Insert between like-btn and comment-btn
    const commentBtn = actions.querySelector(".comment-btn");
    actions.insertBefore(shareBtn, commentBtn);
 
    shareBtn.addEventListener("click", () => {
      const shareURL = `${window.location.origin}${window.location.pathname}?post=${postId}`;
      if (navigator.share) {
        navigator.share({ title: "Rhesmos", url: shareURL }).catch(() => {});
      } else {
        navigator.clipboard.writeText(shareURL)
          .then(() => alert("Link copied to clipboard!"))
          .catch(() => alert("Copy this link: " + shareURL));
      }
    });
  }
 
  // Watch the feed for posts being added
  const feed = document.getElementById("feed");
  if (!feed) return;
 
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.classList.contains("post")) addShareButton(node);
        if (node.querySelectorAll) {
          node.querySelectorAll(".post").forEach(addShareButton);
        }
      });
    });
  });
 
  observer.observe(feed, { childList: true, subtree: true });
 
})();