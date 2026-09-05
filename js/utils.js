import { timeAgo } from "./data.js";

export const $ = id => document.getElementById(id);

export function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

export function avatarInitial(name) {
    return (name || "?").charAt(0).toUpperCase();
}

export function userAvatarHtml(user, sizeClass = "user-avatar") {
    const name = user.displayName || user.email?.split("@")[0] || "?";
    if (user.photoURL) {
       return `<img src="${escapeHtml(user.photoURL)}" class="${sizeClass} ${sizeClass}-img" alt="${escapeHtml(name)}" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\\'${sizeClass}\\'>${avatarInitial(name)}</span>';">`;
    }
    return `<span class="${sizeClass}">${avatarInitial(name)}</span>`;
}

export function formatDate(ts) {
    if (!ts) return "Vừa xong";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return timeAgo(date);
}

export function showToast(msg, icon = "✅") {
    const toastEl = $("toast");
    if (!toastEl) return;
    if($("toastIcon"))
    $("toastIcon").textContent = icon;
    $("toastMsg").textContent = msg;
    bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3000 }).show();
}

export function setActiveNav(page) {
    document.querySelectorAll(".nav-link[data-page]").forEach(link => {
        link.classList.toggle("active", link.dataset.page === page);
    });
}
