document.addEventListener("DOMContentLoaded", () => {
 
  // =========================
  // CLOUDINARY CONFIG
  // =========================
  const CLOUDINARY_CLOUD_NAME    = "dextyw0r3";
  const CLOUDINARY_UPLOAD_PRESET = "fb62qodk";
 
  // =========================
  // USER SETUP (handled in spill.html)
  // =========================
  const username = localStorage.getItem("spillUsername");
  let userAvatar = localStorage.getItem("spillAvatar");
 
  if (userAvatar && !userAvatar.startsWith("http")) {
    localStorage.removeItem("spillAvatar");
    userAvatar = null;
  }
 
  if (!userAvatar && username) {
    userAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
    localStorage.setItem("spillAvatar", userAvatar);
  }
 
  const usernameEl = document.getElementById("username");
  const avatarEl   = document.getElementById("user-avatar");
  if (usernameEl) usernameEl.textContent = username;
  if (avatarEl)   avatarEl.src = userAvatar;
 
  // =========================
  // DOM ELEMENTS
  // =========================
  const feed        = document.getElementById("feed");
  const modal       = document.getElementById("spill-modal");
  const openBtn     = document.getElementById("spill-button");
  const closeBtn    = document.getElementById("close-btn");
  const postBtn     = document.getElementById("post-btn");
  const textInput   = document.getElementById("spill-text");
  const mediaInput  = document.getElementById("media-input");
  const themeToggle = document.getElementById("theme-toggle");
 
  // =========================
  // HELPERS
  // =========================
 
  function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }
 
  function formatTime(timestamp) {
    if (!timestamp) return "Just now";
 
    let date;
    if (typeof timestamp.toDate === "function") {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return "Just now";
    }
 
    const now  = new Date();
    const diff = Math.floor((now - date) / 1000);
 
    if (diff < 60)    return "Just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  }
 
  function buildMediaHTML(url) {
    if (!url) return "";
    const safeURL = escapeHTML(url);
    if (/\.(mp4|mov|webm)$/i.test(url) || url.includes("/video/upload/")) {
      return `<video src="${safeURL}" controls style="max-width:100%;border-radius:8px;margin-top:10px;"></video>`;
    }
    return `<img src="${safeURL}" alt="Spill image" style="max-width:100%;border-radius:8px;margin-top:10px;">`;
  }
 
  // =========================
  // CLOUDINARY UPLOAD
  // =========================
  async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
 
    const resourceType = file.type.startsWith("video/") ? "video" : "image";
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
 
    const response = await fetch(url, { method: "POST", body: formData });
    if (!response.ok) throw new Error("Cloudinary upload failed");
 
    const data = await response.json();
    return data.secure_url;
  }
 
  // =========================
  // CREATE POST
  // =========================
  async function createPost(text, file) {
    let mediaURL = "";
 
    if (file) {
      try {
        if (postBtn) { postBtn.textContent = "Uploading..."; postBtn.disabled = true; }
        mediaURL = await uploadToCloudinary(file);
      } catch (error) {
        console.error("Upload error:", error);
        alert("Media upload failed. Posting text only.");
      } finally {
        if (postBtn) { postBtn.textContent = "Post"; postBtn.disabled = false; }
      }
    }
 
    const category = window.SPILL_CATEGORY || "general";
 
    const postData = {
      username:  username,
      avatar:    userAvatar,
      text:      text || "",
      mediaURL:  mediaURL,
      category:  category,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt: firebase.firestore.Timestamp.fromDate(
        new Date(Date.now() + 48 * 60 * 60 * 1000)
      ),
      likes:   0,
      likedBy: []
    };
 
    try {
      await db.collection("posts").add(postData);
    } catch (error) {
      console.error("Error posting:", error);
      alert("Failed to post. Check your Firebase Firestore security rules.");
    }
  }
 
  // =========================
  // RENDER A SINGLE POST
  // =========================
  function renderPost(doc) {
    const data   = doc.data();
    const postId = doc.id;
 
    if (
      data.expiresAt &&
      typeof data.expiresAt.toDate === "function" &&
      data.expiresAt.toDate() < new Date()
    ) {
      doc.ref.delete().catch(() => {});
      return null;
    }
 
    const postEl = document.createElement("div");
    postEl.className = "post";
    postEl.dataset.id = postId;
 
    const authorAvatar = escapeHTML(
      data.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.username || "anon")}`
    );
 
    postEl.innerHTML = `
      <div class="post-header">
        <img src="${authorAvatar}" alt="Avatar">
        <strong>${escapeHTML(data.username || "Anonymous")}</strong>
        <span class="post-time">${formatTime(data.createdAt)}</span>
      </div>
      <div class="post-content">
        <p>${escapeHTML(data.text || "")}</p>
        ${buildMediaHTML(data.mediaURL)}
      </div>
      <div class="post-actions">
        <button class="like-btn" data-id="${postId}">💙 <span class="like-count">${data.likes || 0}</span></button>
        <button class="comment-btn" data-id="${postId}">💬 <span class="comment-count">0</span></button>
      </div>
      <div class="comment-section" data-id="${postId}" style="margin-top:10px;">
        <div class="comments-list" data-id="${postId}"></div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <input type="text" class="comment-input" placeholder="Write a comment..." data-id="${postId}"
            style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border-color);
                   background:var(--bg-color);color:var(--text-color);font-size:14px;">
          <button class="submit-comment" data-id="${postId}"
            style="padding:8px 14px;background:var(--accent);color:white;border:none;
                   border-radius:8px;cursor:pointer;font-weight:600;">Post</button>
        </div>
      </div>
    `;
 
    // Like
    postEl.querySelector(".like-btn").addEventListener("click", async () => {
      try {
        const postRef = db.collection("posts").doc(postId);
        const snap    = await postRef.get();
        if (!snap.exists) return;
        const d = snap.data();
        if (d.likedBy && d.likedBy.includes(username)) return;
        await postRef.update({
          likes:   firebase.firestore.FieldValue.increment(1),
          likedBy: firebase.firestore.FieldValue.arrayUnion(username)
        });
      } catch (err) {
        console.error("Like error:", err);
      }
    });
 
    // Comment toggle
    postEl.querySelector(".comment-btn").addEventListener("click", () => {
      const section = postEl.querySelector(".comment-section");
      const isOpen  = section.classList.contains("open");
      section.classList.toggle("open");
      if (!isOpen) loadComments(postId, postEl.querySelector(".comments-list"));
    });
 
    // Submit comment
    postEl.querySelector(".submit-comment").addEventListener("click", async () => {
      const input       = postEl.querySelector(".comment-input");
      const commentText = input.value.trim();
      if (!commentText) return;
      try {
        await db.collection("posts").doc(postId).collection("comments").add({
          username:  username,
          avatar:    userAvatar,
          text:      commentText,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        input.value = "";
        loadComments(postId, postEl.querySelector(".comments-list"));
        loadCommentCount(postId, postEl);
      } catch (err) {
        console.error("Comment error:", err);
      }
    });
 
    loadCommentCount(postId, postEl);
 
    return postEl;
  }
 
  // =========================
  // COMMENT COUNT
  // =========================
  function loadCommentCount(postId, postEl) {
    db.collection("posts").doc(postId).collection("comments")
      .get()
      .then(snap => {
        const countEl = postEl.querySelector(".comment-count");
        if (countEl) countEl.textContent = snap.size;
      })
      .catch(() => {});
  }
 
  // =========================
  // LOAD COMMENTS (with replies)
  // =========================
  function loadComments(postId, listEl) {
    if (!listEl) return;
    db.collection("posts").doc(postId).collection("comments")
      .orderBy("createdAt", "asc")
      .get()
      .then((snap) => {
        listEl.innerHTML = "";
        if (snap.empty) {
          listEl.innerHTML = `<p style="color:var(--muted);font-size:13px;">No comments yet.</p>`;
          return;
        }
        snap.forEach((doc) => {
          const c          = doc.data();
          const commentId  = doc.id;
          const commentAvatar = escapeHTML(
            c.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.username || "anon")}`
          );
 
          const el = document.createElement("div");
          el.className = "comment-item";
          el.dataset.commentId = commentId;
          el.innerHTML = `
            <div style="display:flex;gap:8px;align-items:flex-start;padding:8px;background:var(--bg-color);border-radius:8px;">
              <img src="${commentAvatar}" alt="Avatar"
                style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;">
              <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <strong style="font-size:13px;color:var(--accent);">${escapeHTML(c.username || "Anonymous")}</strong>
                  <span style="font-size:11px;color:var(--muted);">${formatTime(c.createdAt)}</span>
                </div>
                <p style="margin:2px 0 4px;font-size:14px;color:var(--text-color);">${escapeHTML(c.text)}</p>
                <button class="reply-toggle-btn" style="font-size:12px;color:var(--muted);background:none;border:none;cursor:pointer;padding:0;">
                  💬 Reply
                </button>
                <div class="reply-box" style="display:none;margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
                  <input type="text" class="reply-input" placeholder="Reply to ${escapeHTML(c.username || "Anonymous")}..."
                    style="flex:1;min-width:0;padding:6px 10px;border-radius:8px;border:1px solid var(--border-color);
                           background:var(--bg-color);color:var(--text-color);font-size:13px;">
                  <button class="submit-reply"
                    style="padding:6px 12px;background:var(--accent);color:white;border:none;
                           border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">Send</button>
                </div>
                <div class="replies-list" style="margin-top:6px;padding-left:8px;border-left:2px solid var(--border-color);"></div>
              </div>
            </div>
          `;
 
          // Hide reply box initially
          el.querySelector(".reply-box").style.display = "none";
 
          // Toggle reply box
          el.querySelector(".reply-toggle-btn").addEventListener("click", () => {
            const box = el.querySelector(".reply-box");
            const isOpen = box.style.display !== "none";
            box.style.display = isOpen ? "none" : "flex";
            if (!isOpen) el.querySelector(".reply-input").focus();
          });
 
          // Submit reply
          el.querySelector(".submit-reply").addEventListener("click", async () => {
            const input     = el.querySelector(".reply-input");
            const replyText = input.value.trim();
            if (!replyText) return;
            try {
              await db.collection("posts").doc(postId)
                .collection("comments").doc(commentId)
                .collection("replies").add({
                  username:  username,
                  avatar:    userAvatar,
                  text:      replyText,
                  createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
              input.value = "";
              el.querySelector(".reply-box").style.display = "none";
              loadReplies(postId, commentId, el.querySelector(".replies-list"));
            } catch (err) {
              console.error("Reply error:", err);
            }
          });
 
          listEl.appendChild(el);
 
          // Load existing replies
          loadReplies(postId, commentId, el.querySelector(".replies-list"));
        });
      })
      .catch((err) => console.error("Comments load error:", err));
  }
 
  // =========================
  // LOAD REPLIES
  // =========================
  function loadReplies(postId, commentId, repliesEl) {
    if (!repliesEl) return;
    db.collection("posts").doc(postId)
      .collection("comments").doc(commentId)
      .collection("replies")
      .orderBy("createdAt", "asc")
      .get()
      .then(snap => {
        repliesEl.innerHTML = "";
        snap.forEach(doc => {
          const r = doc.data();
          const replyAvatar = escapeHTML(
            r.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(r.username || "anon")}`
          );
          const replyEl = document.createElement("div");
          replyEl.style.cssText = "display:flex;gap:6px;align-items:flex-start;margin-top:6px;";
          replyEl.innerHTML = `
            <img src="${replyAvatar}" alt="Avatar"
              style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0;">
            <div>
              <div style="display:flex;align-items:center;gap:6px;">
                <strong style="font-size:12px;color:var(--accent);">${escapeHTML(r.username || "Anonymous")}</strong>
                <span style="font-size:11px;color:var(--muted);">${formatTime(r.createdAt)}</span>
              </div>
              <p style="margin:1px 0 0;font-size:13px;color:var(--text-color);">${escapeHTML(r.text)}</p>
            </div>
          `;
          repliesEl.appendChild(replyEl);
        });
      })
      .catch(() => {});
  }
 
  // =========================
  // LOAD POSTS (Real-time)
  // =========================
  function loadPosts() {
    if (!feed) return;
 
    const category = window.SPILL_CATEGORY || null;
    let query = db.collection("posts").orderBy("createdAt", "desc");
    if (category) query = query.where("category", "==", category);
 
    query.onSnapshot((snapshot) => {
      const fragment = document.createDocumentFragment();
      let hasPost = false;
 
      snapshot.forEach((doc) => {
        const postEl = renderPost(doc);
        if (postEl) { fragment.appendChild(postEl); hasPost = true; }
      });
 
      feed.innerHTML = "";
      if (!hasPost) {
        const empty = document.createElement("p");
        empty.style.cssText = "text-align:center;color:var(--muted);margin-top:40px;";
        empty.textContent = "No spills yet. Be the first! 🫗";
        feed.appendChild(empty);
      } else {
        feed.appendChild(fragment);
      }
 
      if (typeof window.hideSkeleton === "function") window.hideSkeleton();
 
    }, (error) => {
      console.error("Snapshot error:", error);
      if (typeof window.hideSkeleton === "function") window.hideSkeleton();
      if (feed && error.code === "permission-denied") {
        feed.innerHTML = `
          <p style="text-align:center;color:var(--muted);margin-top:40px;">
            ⚠️ Unable to load posts — Firebase rules are blocking access.<br>
            <small>Go to Firebase Console → Firestore → Rules and update them.</small>
          </p>`;
      }
    });
  }
 
  // =========================
  // MODAL
  // =========================
  if (openBtn)  openBtn.addEventListener("click",  () => modal && modal.classList.add("active"));
  if (closeBtn) closeBtn.addEventListener("click", () => modal && modal.classList.remove("active"));
  if (modal)    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("active"); });
 
  if (postBtn) {
    postBtn.addEventListener("click", async () => {
      const text = textInput ? textInput.value.trim() : "";
      const file = mediaInput ? mediaInput.files[0] : null;
      if (!text && !file) { alert("Please write something or upload media before spilling."); return; }
      await createPost(text, file);
      if (textInput)  textInput.value  = "";
      if (mediaInput) mediaInput.value = "";
      if (modal)      modal.classList.remove("active");
    });
  }
 
  // =========================
  // THEME TOGGLE
  // =========================
  if (themeToggle) {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";
 
    themeToggle.addEventListener("click", () => {
      const current  = document.documentElement.getAttribute("data-theme");
      const newTheme = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      themeToggle.textContent = newTheme === "dark" ? "☀️" : "🌙";
    });
  }
 
  // =========================
  // INIT
  // =========================
  loadPosts();
 
});