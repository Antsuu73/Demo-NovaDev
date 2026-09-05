// admin-users.js — Quản lý Thành viên (Hiển thị, Tìm kiếm, Xóa & Realtime Firestore)

import {
    db, collection, query, orderBy, onSnapshot, doc, deleteDoc
} from "../js/firebase-config.js";
import { $, showToast, formatDate, escapeHtml } from "./admin-utils.js";

let allUsers = [];

/**
 * Trả về danh sách tất cả người dùng hiện có trong state
 * @returns {Array}
 */
export function getAllUsers() {
    return allUsers;
}

/**
 * Đăng ký lắng nghe danh sách thành viên từ Firestore theo thời gian thực
 * @param {Function} onUpdate - Callback khi dữ liệu thay đổi (nhận allUsers)
 */
export function subscribeUsers(onUpdate) {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    onSnapshot(q, snap => {
        allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        onUpdate?.(allUsers);
    }, err => {
        console.warn("Firestore users query fallback (chưa có index createdAt):", err);
        onSnapshot(collection(db, "users"), snap => {
            allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            onUpdate?.(allUsers);
        }, () => {});
    });
}

/**
 * Hiển thị danh sách thành viên mới nhất trong tab Tổng quan
 */
export function renderOverviewUsers() {
    const list = $("overviewUsersList");
    if (!list) return;

    const recent = allUsers.slice(0, 5);
    if (recent.length === 0) {
        list.innerHTML = `<div class="p-3 text-center text-muted">Chưa có thành viên nào.</div>`;
        return;
    }

    list.innerHTML = recent.map(u => `
        <div class="list-group-item d-flex align-items-center justify-content-between py-3">
            <div>
                <strong class="d-block">${escapeHtml(u.displayName || u.email)}</strong>
                <small class="text-muted">${u.email || ""}</small>
            </div>
            <span class="badge bg-light text-dark border">${u.provider === "google.com" ? "Google" : "Email"}</span>
        </div>
    `).join("");
}

/**
 * Hiển thị bảng thành viên trong tab Quản lý Thành viên (có lọc tìm kiếm)
 */
export function renderUsersTable() {
    const tbody = $("adminUsersTable");
    if (!tbody) return;

    const search = $("userSearchInput")?.value.trim().toLowerCase() || "";

    let filtered = [...allUsers];
    if (search) {
        filtered = filtered.filter(u =>
            (u.displayName || "").toLowerCase().includes(search) ||
            (u.email || "").toLowerCase().includes(search)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Không có thành viên nào thỏa điều kiện.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(u => `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-primary rounded-circle p-2">${(u.displayName || u.email || "U")[0].toUpperCase()}</span>
                    <strong>${escapeHtml(u.displayName || "Thành viên")}</strong>
                </div>
            </td>
            <td>${escapeHtml(u.email || "-")}</td>
            <td>
                <span class="badge ${u.provider === "google.com" ? "bg-danger" : "bg-secondary"}">${u.provider === "google.com" ? "Google" : "Email & Password"}</span>
            </td>
            <td><small>${formatDate(u.createdAt)}</small></td>
            <td class="text-end">
                <a href="../profile.html?uid=${u.uid || u.id}" target="_blank" class="btn btn-sm btn-outline-secondary me-1">Hồ sơ</a>
                <button class="btn btn-sm btn-outline-danger btn-delete-user" data-id="${u.id}">Xóa</button>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".btn-delete-user").forEach(btn => {
        btn.addEventListener("click", () => deleteUser(btn.dataset.id));
    });
}

/**
 * Xóa một tài khoản thành viên khỏi Firestore
 * @param {string} id - Document ID của user trong Firestore
 */
export async function deleteUser(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa tài khoản này khỏi hệ thống?")) return;
    try {
        await deleteDoc(doc(db, "users", id));
        showToast("Đã xóa người dùng thành công!");
    } catch (err) {
        console.error("Lỗi xóa người dùng:", err);
        showToast("Không thể xóa người dùng: " + err.message);
    }
}

/**
 * Khởi tạo bộ lọc tìm kiếm thành viên
 */
export function initUserFilters() {
    $("userSearchInput")?.addEventListener("input", renderUsersTable);
}
