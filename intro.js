// intro.js — Handles intro screen logic for index.html
 
const enterBtn = document.getElementById("enter-btn");
const leaveBtn = document.getElementById("leave-btn");
const introScreen = document.getElementById("intro-screen");
 
// Enter button → fade out then go to spill.html
if (enterBtn) {
  enterBtn.addEventListener("click", () => {
    introScreen.classList.add("fade-out");
 
    setTimeout(() => {
      window.location.href = "spill.html";
    }, 500); // matches the CSS transition duration
  });
}
 
// Leave button → close / go back
if (leaveBtn) {
  leaveBtn.addEventListener("click", () => {
    // If there's a previous page, go back; otherwise close tab
    if (document.referrer) {
      window.history.back();
    } else {
      window.close();
    }
  });
}