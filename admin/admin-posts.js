// admin-posts.js — Quản lý Bài viết (CRUD + Realtime Firestore)

import {
    db, collection, addDoc, doc, updateDoc, deleteDoc,
    query, orderBy, onSnapshot, serverTimestamp
} from "../js/firebase-config.js";
import { CATEGORIES, getCategoryName, getTypeName } from "../js/data.js";
import { $, showToast, formatDate, escapeHtml } from "./admin-utils.js";

// State dùng chung (được thiết lập từ admin.js)
let allPosts = [];
let currentUserRef = { value: null };

/**
 * Trả về bản sao danh sách bài viết
 * @returns {Array}
 */
export function getAllPosts() {
    return allPosts;
}

/**
 * Gán tham chiếu đến currentUser
 * @param {{ value: import("firebase/auth").User|null }} ref
 */
export function setCurrentUserRef(ref) {
    currentUserRef = ref;
}

/**
 * Subscribe realtime Firestore và cập nhật bảng bài viết
 * @param {Function} onUpdate - Callback mỗi khi dữ liệu thay đổi (nhận allPosts)
 */
export function subscribePosts(onUpdate) {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(q, snap => {
        allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        onUpdate(allPosts);
    }, err => {
        console.error("Firestore posts error:", err);
        showToast("Lỗi tải bài viết từ Firestore");
    });
}

/**
 * Render bảng bài viết trong tab Quản lý Bài viết
 */
export function renderPostsTable() {
    const tbody = $("adminPostsTable");
    if (!tbody) return;

    const search = $("postSearchInput")?.value.trim().toLowerCase() || "";
    const filterType = $("postFilterType")?.value || "all";
    const filterCat = $("postFilterCategory")?.value || "all";

    let filtered = [...allPosts];

    if (filterType !== "all") filtered = filtered.filter(p => (p.type || "discussion") === filterType);
    if (filterCat !== "all") filtered = filtered.filter(p => p.category === filterCat);
    if (search) {
        filtered = filtered.filter(p =>
            (p.title || "").toLowerCase().includes(search) ||
            (p.authorName || "").toLowerCase().includes(search)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Không tìm thấy bài viết thỏa điều kiện.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => `
        <tr>
            <td>
                <a href="../post.html?id=${p.id}" target="_blank" class="fw-bold text-dark text-decoration-none">${escapeHtml(p.title)}</a>
            </td>
            <td>
                <span class="badge ${p.type === "qa" ? "bg-warning text-dark" : "bg-primary"}">${getTypeName(p.type)}</span>
            </td>
            <td>
                <span class="badge bg-secondary-subtle text-secondary">${getCategoryName(p.category)}</span>
            </td>
            <td>${escapeHtml(p.authorName)}</td>
            <td>
                <small class="text-muted">${p.views || 0} / ${p.likes || 0} / ${p.commentCount || 0}</small>
            </td>
            <td><small>${formatDate(p.createdAt)}</small></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary me-1 btn-edit-post" data-id="${p.id}">Sửa</button>
                <button class="btn btn-sm btn-outline-danger btn-delete-post" data-id="${p.id}">Xóa</button>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".btn-edit-post").forEach(btn => {
        btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });
    tbody.querySelectorAll(".btn-delete-post").forEach(btn => {
        btn.addEventListener("click", () => deletePost(btn.dataset.id));
    });
}

/**
 * Render bảng tổng quan bài viết mới nhất (5 bài)
 */
export function renderOverviewPosts() {
    const tbody = $("overviewPostsTable");
    if (!tbody) return;

    const recent = allPosts.slice(0, 5);
    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">Chưa có bài viết nào.</td></tr>`;
        return;
    }

    tbody.innerHTML = recent.map(p => `
        <tr>
            <td class="fw-semibold">${escapeHtml(p.title)}</td>
            <td><span class="badge ${p.type === "qa" ? "bg-warning text-dark" : "bg-primary"}">${getTypeName(p.type)}</span></td>
            <td>${escapeHtml(p.authorName)}</td>
            <td>Thích: ${p.likes || 0}</td>
            <td>
                <a href="../post.html?id=${p.id}" target="_blank" class="btn btn-sm btn-outline-secondary">Xem</a>
            </td>
        </tr>
    `).join("");
}

/**
 * Mở modal Sửa bài viết và điền dữ liệu
 * @param {string} id
 */
export function openEditModal(id) {
    const post = allPosts.find(p => p.id === id);
    if (!post) return;

    $("adminEditId").value = post.id;
    $("adminEditType").value = post.type || "discussion";
    $("adminEditCategory").value = post.category || "";
    $("adminEditTitle").value = post.title || "";
    $("adminEditContent").value = post.content || "";

    const modalEl = $("adminEditModal");
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

/**
 * Khởi tạo form Sửa bài viết (submit handler)
 */
export function initEditPostForm() {
    $("adminEditForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const id = $("adminEditId").value;
        if (!id) return;

        try {
            await updateDoc(doc(db, "posts", id), {
                type: $("adminEditType").value,
                category: $("adminEditCategory").value,
                title: $("adminEditTitle").value.trim(),
                content: $("adminEditContent").value.trim(),
                updatedAt: serverTimestamp()
            });

            bootstrap.Modal.getInstance($("adminEditModal"))?.hide();
            showToast("Cập nhật bài viết thành công!");
        } catch (err) {
            console.error("Lỗi sửa bài viết:", err);
            showToast("Không thể cập nhật bài viết: " + err.message);
        }
    });
}

/**
 * Xóa bài viết khỏi Firestore
 * @param {string} id
 */
export async function deletePost(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
    try {
        await deleteDoc(doc(db, "posts", id));
        showToast("Đã xóa bài viết!");
    } catch (err) {
        console.error("Lỗi xóa bài viết:", err);
        showToast("Không thể xóa bài viết");
    }
}

/**
 * Khởi tạo form Đăng bài viết mới từ Admin
 */
export function initCreatePostForm() {
    $("adminCreatePostForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const type = $("adminPostType").value;
        const category = $("adminPostCategory").value;
        const title = $("adminPostTitle").value.trim();
        const content = $("adminPostContent").value.trim();

        if (!title || !content) return;

        const user = currentUserRef.value;
        const authorName = user?.displayName || user?.email?.split("@")[0] || "Admin NovaDev";
        const authorId = user?.uid || "admin";

        try {
            await addDoc(collection(db, "posts"), {
                title,
                content,
                type,
                category,
                authorName,
                authorId,
                views: 0,
                likes: 0,
                commentCount: 0,
                createdAt: serverTimestamp(),
                likedBy: []
            });

            $("adminPostTitle").value = "";
            $("adminPostContent").value = "";
            showToast("Đã đăng bài viết thành công!");

            const sidebar = $("adminSidebar");
            sidebar.querySelector("[data-tab='posts']")?.click();
        } catch (err) {
            console.error("Lỗi đăng bài mới:", err);
            showToast("Không thể đăng bài viết: " + err.message);
        }
    });
}

/**
 * Khởi tạo event listeners bộ lọc bảng bài viết
 */
export function initPostFilters() {
    $("postSearchInput")?.addEventListener("input", renderPostsTable);
    $("postFilterType")?.addEventListener("change", renderPostsTable);
    $("postFilterCategory")?.addEventListener("change", renderPostsTable);
}

/**
 * Điền các lựa chọn danh mục vào select
 * @param {string[]} selectIds - Mảng ID của các select element
 */
export function initCategorySelects(selectIds) {
    selectIds.forEach(id => {
        const sel = $(id);
        if (!sel) return;

        if (id === "postFilterCategory") {
            sel.innerHTML = `<option value="all">Tất cả danh mục</option>`;
        } else {
            sel.innerHTML = "";
        }

        CATEGORIES.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.name;
            sel.appendChild(opt);
        });
    });
}
