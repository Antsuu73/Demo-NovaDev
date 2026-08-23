// admin-utils.js — Tiện ích dùng chung cho Admin Dashboard

/**
 * Shorthand getElementById
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export const $ = id => document.getElementById(id);

/**
 * Hiển thị toast thông báo
 * @param {string} msg
 */
export function showToast(msg) {
    const toastEl = $("toast");
    if (!toastEl) return;
    $("toastMsg").textContent = msg;
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
}

/**
 * Định dạng ngày theo định dạng Việt Nam (dd/mm/yyyy)
 * @param {*} ts - Firestore Timestamp hoặc Date
 * @returns {string}
 */
export function formatDate(ts) {
    if (!ts) return "Mới đây";
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Escape ký tự đặc biệt HTML để tránh XSS
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str = "") {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
