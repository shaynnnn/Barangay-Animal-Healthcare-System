(function () {
  "use strict";

  function escapeText(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function formatDate(value) {
    if (value && typeof value.toDate === "function") value = value.toDate();
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value.toLocaleDateString("en-US");
    }
    var s = String(value || "");
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? m[2] + "/" + m[3] + "/" + m[1] : (s || "Date not specified");
  }

  function getDb() {
    // firebase.js in this project uses the classic Firebase v8 SDK.
    if (window.db && typeof window.db.collection === "function") return window.db;
    if (window.firebase && firebase.apps && firebase.apps.length &&
        typeof firebase.firestore === "function") {
      return firebase.firestore();
    }
    return null;
  }

  function renderList(element, docs) {
    element.innerHTML = "";
    if (!docs.length) {
      element.innerHTML = '<p class="dashboard-muted">No news documents were found in the <code>news</code> collection. Confirm that the administrator published the post to this Firebase project.</p>';
      return;
    }
    docs.forEach(function (item) {
      var category = escapeText(item.category || "Announcement");
      var headline = escapeText(item.headline || "Community update");
      var description = escapeText(item.description || "");
      var date = escapeText(formatDate(item.when || item.createdAt));
      var time = escapeText(item.happeningTime || "Time not specified");
      var where = escapeText(item.where || [item.address, item.barangay].filter(Boolean).join(", ") || "Location not specified");
      var postedBy = escapeText(item.postedBy || "Barangay Animal Health System");
      var card = document.createElement("article");
      card.className = "news-card";
      card.innerHTML = '<span class="news-category">' + category + '</span><h3>' + headline +
        '</h3><p>' + description + '</p><p class="news-meta">📅 ' + date + ' · ' + time +
        '<br>📍 ' + where + '<br>Posted by ' + postedBy + '</p>';
      if (window.currentUserRole === "admin" && item.id) {
        var removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "danger-btn news-takedown-btn";
        removeButton.textContent = "Take Down News";
        removeButton.addEventListener("click", function () {
          if (window.currentUserRole !== "admin") return;
          if (!window.confirm('Take down the news post "' + (item.headline || "this post") + '"? This cannot be undone.')) return;
          var db = getDb();
          db.collection("news").doc(item.id).delete().catch(function (error) {
            console.error("Unable to take down news:", error);
            window.alert("Unable to take down this news post. Verify administrator permissions and Firestore rules.");
          });
        });
        var actionBox = document.createElement("div");
        actionBox.className = "news-admin-action-box";
        actionBox.appendChild(removeButton);
        card.appendChild(actionBox);
      }
      element.appendChild(card);
    });
  }

  function startList(element) {
    if (!element || element.dataset.standaloneNewsStarted === "yes") return;
    element.dataset.standaloneNewsStarted = "yes";
    element.innerHTML = '<p class="dashboard-muted">Connecting to community news…</p>';

    var db = getDb();
    if (!db) {
      element.innerHTML = '<div class="news-load-error"><strong>Firebase is not initialized.</strong><p>Check the Firebase SDK script tags and firebase.js configuration.</p></div>';
      console.error("[News] Firestore is not available on window or through the Firebase SDK.");
      return;
    }

    var completed = false;
    var timeout = window.setTimeout(function () {
      if (!completed) {
        element.innerHTML = '<div class="news-load-error"><strong>News is taking too long to load.</strong><p>Open Developer Tools (F12) → Console and check the Firebase error. Also verify that this page uses the same Firebase project where news was posted.</p></div>';
      }
    }, 10000);

    db.collection("news").get().then(function (snapshot) {
      completed = true;
      window.clearTimeout(timeout);
      var docs = snapshot.docs.map(function (doc) {
        return Object.assign({ id: doc.id }, doc.data());
      }).filter(function (item) {
        var status = String(item.status || "Published").trim().toLowerCase();
        return ["published", "approved", "live"].indexOf(status) !== -1;
      });
      docs.sort(function (a, b) {
        var ta = a.createdAt && typeof a.createdAt.toMillis === "function" ? a.createdAt.toMillis() : 0;
        var tb = b.createdAt && typeof b.createdAt.toMillis === "function" ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
      renderList(element, docs.slice(0, element.id === "homeNewsList" ? 3 : 30));
    }).catch(function (error) {
      completed = true;
      window.clearTimeout(timeout);
      console.error("[News] Firestore read failed:", error);
      element.innerHTML = '<div class="news-load-error"><strong>News could not be loaded.</strong><p>Firebase error: <code>' +
        escapeText(error && (error.code || error.message) || "unknown error") +
        '</code></p><p>Check Firestore Rules and confirm that the news collection is in the configured Firebase project.</p></div>';
    });
  }

  function boot() {
    startList(document.getElementById("homeNewsList"));
    startList(document.getElementById("newsList"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
