/* Authentication and page access for Barangay Animal Health System.
   Firebase SDK v8.10.0. Page permissions must also be enforced by Firestore rules. */
(function () {
    "use strict";

    const path = window.location.pathname.toLowerCase();
    const isLogin = path.endsWith("/login.html") || path.endsWith("login.html");
    const isRegister = path.endsWith("/register.html") || path.endsWith("register.html");
    const isHome = path.endsWith("/index.html") || path.endsWith("index.html") || path.endsWith("/");
    const isAdoption = path.endsWith("adoption.html");
    const isProfile = path.endsWith("profile.html");
    const isProtected = !isHome && !isLogin && !isRegister && !isProfile;
    const rootPrefix = path.includes("/modules/") ? "../" : "";

    function message(text, isError) {
        const target = document.getElementById("authMessage");
        if (target) {
            target.textContent = text;
            target.className = "auth-message" + (isError ? " error" : " success");
        } else {
            alert(text);
        }
    }

    function addAuthNav(user, role) {
        const nav = document.getElementById("mainNav");
        if (!nav || document.getElementById("authNavItem")) return;
        const wrapper = document.createElement("span");
        wrapper.id = "authNavItem";
        wrapper.className = "auth-nav-item";
        if (user) {
            const label = user.email || user.displayName || "My Profile";
            wrapper.innerHTML = `<a class="auth-user-label" href="${rootPrefix}profile.html" title="Open your profile">${escapeText(label)}</a>`;
            nav.appendChild(wrapper);
        } else {
            // Login and Register pages already have these links in their HTML.
            // Do not append duplicates; other pages can receive the auth links here.
            if (nav.querySelector('a[href$="login.html"]') && nav.querySelector('a[href$="register.html"]')) return;
            wrapper.innerHTML = `<a href="${rootPrefix}login.html">Log In</a><a href="${rootPrefix}register.html">Register</a>`;
            nav.appendChild(wrapper);
        }
    }

    function installNotificationBell(user, role) {
        if (!user || document.getElementById("notificationNav")) return;
        const nav = document.getElementById("mainNav");
        if (!nav) return;
        const wrap = document.createElement("div");
        wrap.id = "notificationNav";
        wrap.className = "notification-nav";
        wrap.innerHTML = `<button type="button" class="notification-bell" id="notificationBell" aria-label="Notifications" aria-expanded="false">🔔<span class="notification-count" id="notificationCount" hidden>0</span></button><section class="notification-popover" id="notificationPopover" hidden><h3>Notifications</h3><div id="notificationItems"><p class="notification-empty">Loading notifications…</p></div></section>`;
        const profileItem = document.getElementById("authNavItem");
        if (profileItem) nav.insertBefore(wrap, profileItem); else nav.appendChild(wrap);
        const bell = document.getElementById("notificationBell");
        const popover = document.getElementById("notificationPopover");
        bell.addEventListener("click", () => {
            const opening = popover.hidden;
            popover.hidden = !opening;
            bell.setAttribute("aria-expanded", String(opening));
        });
        const list = document.getElementById("notificationItems");
        let own = [];
        let admin = [];
        function render() {
            const map = new Map();
            own.concat(admin).forEach(item => map.set(item.id, item));
            const items = Array.from(map.values()).sort((a,b) => {
                const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
                const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
                return tb-ta;
            }).slice(0,25);
            const unread = items.filter(x => !x.read && (x.recipientUid === user.uid)).length;
            const count = document.getElementById("notificationCount");
            count.textContent = unread > 99 ? "99+" : String(unread);
            count.hidden = unread === 0;
            if (!items.length) { list.innerHTML = '<p class="notification-empty">You have no notifications yet.</p>'; return; }
            list.innerHTML = items.map(item => {
                const when = item.createdAt && item.createdAt.toDate ? item.createdAt.toDate().toLocaleString() : "Just now";
                const safe = value => escapeText(value || "");
                return `<article class="notification-item ${item.read ? "notification-read" : ""}"><strong>${safe(item.title || "Update")}</strong><p>${safe(item.message || "")}</p><small>${safe(when)}</small>${item.recipientUid === user.uid && !item.read ? `<br><button type="button" class="notification-mark" data-notification-id="${safe(item.id)}">Mark as read</button>` : ""}</article>`;
            }).join("");
            list.querySelectorAll("[data-notification-id]").forEach(button => button.addEventListener("click", async () => {
                try { await db.collection("notifications").doc(button.dataset.notificationId).update({read:true}); }
                catch (error) { console.error("Could not mark notification read:", error); }
            }));
        }
        db.collection("notifications").where("recipientUid", "==", user.uid).limit(50).onSnapshot(snapshot => {
            own = snapshot.docs.map(doc => ({id:doc.id,...doc.data()})); render();
        }, error => { console.warn("User notifications unavailable:", error); list.innerHTML='<p class="notification-empty">Notifications are temporarily unavailable.</p>'; });
        if (role === "admin") {
            db.collection("notifications").where("recipientRole", "==", "admin").limit(50).onSnapshot(snapshot => {
                admin = snapshot.docs.map(doc => ({id:doc.id,...doc.data()})); render();
            }, error => console.warn("Admin notifications unavailable:", error));
        }
        document.addEventListener("click", event => { if (!wrap.contains(event.target)) { popover.hidden = true; bell.setAttribute("aria-expanded", "false"); } });
    }

    function escapeText(value) {
        return String(value || "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
    }

    function showRestrictedNotice(text) {
        const main = document.querySelector("main");
        if (main) {
            main.innerHTML = `<section class="form-panel auth-restricted"><h1>Access restricted</h1><p>${escapeText(text)}</p><p><a class="primary-btn auth-link-button" href="${rootPrefix}index.html">Back to Home</a></p></section>`;
        }
    }

    function setAdminControls(isAdmin) {
        if (isAdmin) return;
        // These pages are admin-only; hide the action panels immediately while role resolves.
        ["registryForm", "vaccinationForm", "biteForm"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add("hidden");
        });
        document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
    }

    document.addEventListener("DOMContentLoaded", function () {
        const loginForm = document.getElementById("loginForm");
        if (loginForm) loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const button = loginForm.querySelector("button[type=submit]");
            if (button) button.disabled = true;
            try {
                await auth.signInWithEmailAndPassword(email, password);
                window.location.href = rootPrefix + "index.html";
            } catch (error) {
                const errors = {
                    "auth/user-not-found": "No account was found for that email.",
                    "auth/wrong-password": "The email or password is incorrect.",
                    "auth/invalid-credential": "The email or password is incorrect.",
                    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
                    "auth/invalid-email": "Please enter a valid email address."
                };
                message(errors[error.code] || error.message || "Unable to log in.", true);
            } finally { if (button) button.disabled = false; }
        });

        const registerForm = document.getElementById("registerForm");
        if (registerForm) registerForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const name = document.getElementById("fullName").value.trim();
            const email = document.getElementById("email").value.trim().toLowerCase();
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirmPassword").value;
            if (password.length < 8) return message("Use a password with at least 8 characters.", true);
            if (password !== confirmPassword) return message("Passwords do not match.", true);
            const button = registerForm.querySelector("button[type=submit]");
            if (button) button.disabled = true;
            try {
                const credential = await auth.createUserWithEmailAndPassword(email, password);
                const newUser = credential.user;
                const savedName = name || (email.split("@")[0] || "Community Member");

                // Create the basic Firestore user document immediately.
                // The About Me/profile form is optional and is not needed for this write.
                // Self-registration always assigns the regular-user role.
                await db.collection("users").doc(newUser.uid).set({
                    uid: newUser.uid,
                    name: savedName,
                    email: newUser.email || email,
                    role: "user",
                    barangay: document.getElementById("accountBarangay")?.value || "",
                    address: document.getElementById("accountAddress")?.value.trim() || "",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Auth profile display name is helpful but not required to save the account.
                try { await newUser.updateProfile({ displayName: savedName }); }
                catch (profileError) { console.warn("User account saved, but display name could not be updated:", profileError); }
                message("Account created. Redirecting to the home page…", false);
                window.location.href = "index.html";
            } catch (error) {
                const errors = {
                    "auth/email-already-in-use": "That email already has an account. Please log in.",
                    "auth/invalid-email": "Please enter a valid email address.",
                    "auth/weak-password": "Please use a stronger password."
                };
                message(errors[error.code] || error.message || "Unable to create account.", true);
            } finally { if (button) button.disabled = false; }
        });
    });

    if (typeof firebase === "undefined" || !firebase.auth) return;
    auth.onAuthStateChanged(async function (user) {
        if (!user) {
            addAuthNav(null, null);
            if (isProfile) {
                const panel = document.getElementById("profileSignedOut");
                if (panel) panel.hidden = false;
                const content = document.getElementById("profileContent");
                if (content) content.hidden = true;
            }
            if (isProtected) {
                const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = rootPrefix + "login.html?returnTo=" + returnTo;
            }
            if (isLogin || isRegister) return;
            return;
        }

        let role = "user";
        try {
            const userDoc = db.collection("users").doc(user.uid);
            let profile = await userDoc.get();

            // Backfill a minimal profile for accounts that exist in Firebase Authentication
            // but do not yet have a Firestore users/{uid} document. Never overwrite an existing role.
            if (!profile.exists) {
                await userDoc.set({
                    uid: user.uid,
                    name: user.displayName || (user.email ? user.email.split("@")[0] : "Community Member"),
                    email: user.email || "",
                    role: "user",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                profile = await userDoc.get();
            }

            if ((profile.exists && profile.data().role === "admin") || user.uid === "rJfo8plRZnZ0c4SU9kJfUEmH5cC3") role = "admin";
        } catch (error) {
            console.error("Unable to load/create user profile document:", error);
        }
        window.currentUserRole = role;
        window.currentAuthUser = user;
        addAuthNav(user, role);
        installNotificationBell(user, role);

        if (isLogin || isRegister) {
            window.location.href = "index.html";
            return;
        }
        if (isProfile) {
            const logoutButton = document.getElementById("profileLogoutButton");
            if (logoutButton) logoutButton.addEventListener("click", async () => {
                try { await auth.signOut(); window.location.href = "login.html"; }
                catch (error) { console.error(error); message("Unable to log out. Please try again.", true); }
            });
        }
        if (isAdoption) {
            const ownerEmail = document.getElementById("ownerDashboardEmail");
            if (ownerEmail) {
                ownerEmail.value = user.email || "";
                ownerEmail.readOnly = true;
                ownerEmail.setAttribute("aria-label", "Signed-in account email");
            }
        }
        window.dispatchEvent(new CustomEvent("authReady", { detail: { user: user, role: role } }));
        document.querySelectorAll(".admin-only").forEach(el => { el.hidden = role !== "admin"; });
    });
})();
