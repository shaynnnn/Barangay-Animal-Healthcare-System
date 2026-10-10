(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const safe = value => String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  function timeLabel(value){ return value && value.toDate ? value.toDate().toLocaleString() : "Recently submitted"; }
  window.addEventListener("authReady", async event => {
    const user = event.detail.user, role = event.detail.role;
    $("profileContent").hidden = false; $("profileSignedOut").hidden = true;
    $("profileHeading").textContent = user.displayName || "My Profile";
    $("profileEmail").textContent = user.email || "";
    $("profileRole").textContent = role === "admin" ? "Administrator" : "Community member";
    $("profileAvatar").textContent = (user.displayName || user.email || "U").trim().charAt(0).toUpperCase();
    $("profileNameInput").value = user.displayName || "";
    let profileData = {};
    try { const doc = await db.collection("users").doc(user.uid).get(); if(doc.exists) profileData = doc.data(); $("profileBioInput").value = profileData.bio || ""; } catch(e) { console.warn("Could not load profile document",e); }
    const deleteAccountButton = $("deleteAccountButton");
    // Prevent an administrator from accidentally removing their own role document and locking themselves out.
    if (deleteAccountButton && role === "admin") {
      deleteAccountButton.disabled = true;
      deleteAccountButton.title = "Ask another authorized administrator to manage administrator account removal.";
      $("deleteAccountMessage").textContent = "Administrator accounts cannot be self-deleted from this page. Ask another authorized administrator to manage account removal.";
    }
    if (deleteAccountButton && role !== "admin") deleteAccountButton.addEventListener("click", async () => {
      const confirmed = window.confirm("Delete your account permanently? You will be signed out, and this action cannot be undone. Some records already submitted to the barangay may remain for administrative purposes.");
      if (!confirmed) return;
      let credential = null;
      // Firebase requires recent authentication for account deletion. Re-authenticate email/password users.
      if (user.providerData.some(provider => provider.providerId === "password")) {
        const password = window.prompt("For security, enter your current password to confirm account deletion:");
        if (password === null) return;
        if (!password) { $("deleteAccountMessage").textContent = "Password is required to delete your account."; $("deleteAccountMessage").className = "profile-error"; return; }
        try {
          credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
          await user.reauthenticateWithCredential(credential);
        } catch (err) {
          $("deleteAccountMessage").textContent = err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" ? "The password was incorrect. Your account was not deleted." : "Could not verify your identity. Please sign in again and retry.";
          $("deleteAccountMessage").className = "profile-error";
          return;
        }
      } else {
        const ok = window.confirm("This account uses a sign-in provider other than email/password. If Firebase says your session is too old, sign in again and retry. Continue?");
        if (!ok) return;
      }
      deleteAccountButton.disabled = true;
      $("deleteAccountMessage").textContent = "Deleting account…";
      try {
        // Delete the profile document while the user is still authenticated; rules allow self-deletion.
        await db.collection("users").doc(user.uid).delete();
        try {
          await user.delete();
        } catch (err) {
          // Restore a basic profile if Firebase rejects Auth deletion, so the account is not left half-deleted.
          await db.collection("users").doc(user.uid).set({uid:user.uid, name:user.displayName || "", email:user.email || "", role:role, updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(() => {});
          throw err;
        }
        window.location.href = "register.html?accountDeleted=1";
      } catch (err) {
        console.error("Account deletion failed", err);
        $("deleteAccountMessage").textContent = err.code === "auth/requires-recent-login" ? "For security, log out, sign in again, and retry account deletion." : "Account deletion failed. Your account may still be active; please try again or contact the system administrator.";
        $("deleteAccountMessage").className = "profile-error";
        deleteAccountButton.disabled = false;
      }
    });

    $("profileForm").addEventListener("submit", async e => {
      e.preventDefault(); const button = $("profileForm").querySelector("button[type=submit]"); button.disabled = true;
      const name = $("profileNameInput").value.trim(), bio = $("profileBioInput").value.trim();
      try { await user.updateProfile({displayName:name}); await db.collection("users").doc(user.uid).set({uid:user.uid,name,email:user.email || "",bio,role,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}); $("profileHeading").textContent = name || "My Profile"; $("profileAvatar").textContent = (name || user.email || "U").charAt(0).toUpperCase(); $("profileMessage").textContent = "Profile updated successfully."; $("profileMessage").className="profile-success"; const navName=document.querySelector(".auth-user-label"); if(navName) navName.textContent=name || user.email || "My Profile"; }
      catch(err){ console.error(err); $("profileMessage").textContent = "Could not save changes. Check your Firestore rules and try again."; $("profileMessage").className="profile-error"; } finally {button.disabled=false;}
    });
    const activity = $("profileActivity");
    const items=[];
    try {
      const [missions, adoptions] = await Promise.all([
        db.collection("missions").where("submitterUid","==",user.uid).get(),
        db.collection("adoptions").where("ownerUid","==",user.uid).get()
      ]);
      $("myMissionCount").textContent=missions.size; $("myAdoptionCount").textContent=adoptions.size;
      missions.forEach(doc=>{const d=doc.data();items.push({title:d.eventName||"Mission proposal",kind:"Mission proposal",status:d.status||"Pending",detail:[d.eventDate,d.location].filter(Boolean).join(" · "),createdAt:d.createdAt,url:"modules/missions.html"});});
      adoptions.forEach(doc=>{const d=doc.data();items.push({title:d.petName||d.animalType||"Adoption listing",kind:"Adoption listing",status:d.status||"Listed",detail:[d.breed,d.sex].filter(Boolean).join(" · "),createdAt:d.createdAt,url:"modules/adoption.html"});});
      if(role === "admin") {
        const news = await db.collection("news").where("postedByUid","==",user.uid).get();
        news.forEach(doc=>{const d=doc.data();items.push({title:d.headline||"News update",kind:"Community news",status:d.status||"Published",detail:[d.when,d.where].filter(Boolean).join(" · "),createdAt:d.createdAt,url:"modules/news.html"});});
      }
      items.sort((a,b)=>{const ta=a.createdAt&&a.createdAt.toMillis?a.createdAt.toMillis():0;const tb=b.createdAt&&b.createdAt.toMillis?b.createdAt.toMillis():0;return tb-ta;});
      if(!items.length){activity.innerHTML='<p class="dashboard-muted">No mission proposals or adoption listings have been submitted from this account yet.</p>';return;}
      activity.innerHTML=items.map(item=>`<article class="profile-activity-item"><div><span class="profile-activity-kind">${safe(item.kind)}</span><h3>${safe(item.title)}</h3><p>${safe(item.detail||"No extra details")}</p><small>${safe(timeLabel(item.createdAt))}</small></div><span class="profile-status">${safe(item.status)}</span><a href="${item.url}">Open section →</a></article>`).join("");
    } catch(err){ console.error("Could not load profile activity",err); $("myMissionCount").textContent="—";$("myAdoptionCount").textContent="—";activity.innerHTML='<p class="profile-error">Activity could not be loaded. Check the Firestore rules for missions and adoption listings.</p>'; }
  });
})();