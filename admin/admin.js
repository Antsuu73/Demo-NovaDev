import {
    auth, db, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc,
    query, orderBy, onSnapshot, serverTimestamp
} from "../js/firebase-config.js";
import {
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { CATEGORIES, getCategoryName, getCategoryIcon, getTypeName, getTypeIcon } from "../js/data.js";
import { isAdminUser } from "../js/auth.js";

// Helper $
const $ = id => document.getElementById(id);

let allPosts = [];
let allUsers = [];
let currentUser = null;
let isSubscribed = false;

// Toast helper
function showToast(msg) {
    const toastEl = $("toast");
    if (!toastEl) return;
    $("toastMsg").textContent = msg;
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
}

// Format date
function formatDate(ts) {
    if (!ts) return "Mới đây";
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Escape HTML
function escapeHtml(str = "") {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Check Admin Access & toggle UI
function checkAdminAccess(user) {
    const accessDeniedEl = $("adminAccessDenied");
    const wrapperEl = $("adminWrapper");

    if (user && isAdminUser(user)) {
        accessDeniedEl?.classList.add("d-none");
        wrapperEl?.classList.remove("d-none");

        if (!isSubscribed) {
            isSubscribed = true;
            subscribePosts();
            subscribeUsers();
        }
    } else {
        accessDeniedEl?.classList.remove("d-none");
        wrapperEl?.classList.add("d-none");

        const msgEl = $("adminDeniedMessage");
        if (msgEl) {
            if (user) {
                msgEl.textContent = `Tài khoản (${user.email}) không có quyền Quản trị Admin! Vui lòng đăng nhập tài khoản Admin.`;
                msgEl.className = "alert alert-danger text-center mb-4";
            } else {
                msgEl.textContent = "Bạn cần đăng nhập bằng tài khoản Quản trị Admin để tiếp tục.";
                msgEl.className = "alert alert-warning text-center mb-4";
            }
        }
    }
}

// Initialize Tabs
function initTabs() {
    const sidebar = $("adminSidebar");
    if (!sidebar) return;

    sidebar.addEventListener("click", e => {
        const btn = e.target.closest("[data-tab]");
        if (!btn) return;
        
        const tab = btn.dataset.tab;
        sidebar.querySelectorAll("[data-tab]").forEach(el => el.classList.remove("active"));
        btn.classList.add("active");

        document.querySelectorAll(".tab-pane-content").forEach(pane => pane.classList.add("d-none"));
        
        if (tab === "overview") $("paneOverview")?.classList.remove("d-none");
        else if (tab === "posts") $("panePosts")?.classList.remove("d-none");
        else if (tab === "users") $("paneUsers")?.classList.remove("d-none");
        else if (tab === "create") $("paneCreate")?.classList.remove("d-none");

        const titleMap = {
            overview: "Tổng quan hệ thống",
            posts: "Quản lý Bài viết",
            users: "Quản lý Thành viên",
            create: "Đăng bài viết mới từ Admin"
        };
        if ($("pageTitle")) $("pageTitle").textContent = titleMap[tab] || "Quản trị hệ thống";

        if (window.innerWidth < 768) sidebar.classList.remove("show");
    });

    $("btnViewAllPosts")?.addEventListener("click", () => {
        const postsBtn = sidebar.querySelector("[data-tab='posts']");
        if (postsBtn) postsBtn.click();
    });

    $("btnToggleSidebar")?.addEventListener("click", () => {
        sidebar.classList.toggle("show");
    });
}

// Populate category dropdowns
function initCategorySelects() {
    const selectIds = ["postFilterCategory", "adminPostCategory", "adminEditCategory"];
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

// Subscribe Posts from Firestore
function subscribePosts() {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(q, snap => {
        allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderStats();
        renderOverviewPosts();
        renderPostsTable();
    }, err => {
        console.error("Firestore posts error:", err);
        showToast("Lỗi tải bài viết từ Firestore");
    });
}

// Subscribe Users from Firestore
function subscribeUsers() {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    onSnapshot(q, snap => {
        allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderStats();
        renderOverviewUsers();
        renderUsersTable();
    }, err => {
        console.warn("Firestore users query fallback:", err);
        onSnapshot(collection(db, "users"), snap => {
            allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderStats();
            renderOverviewUsers();
            renderUsersTable();
        }, () => {});
    });
}

// Render Stats
function renderStats() {
    if ($("adminStatPosts")) $("adminStatPosts").textContent = allPosts.length;
    
    const qaCount = allPosts.filter(p => p.type === "qa").length;
    const discCount = allPosts.filter(p => (p.type || "discussion") === "discussion").length;
    
    if ($("adminStatQA")) $("adminStatQA").textContent = qaCount;
    if ($("adminStatDiscussion")) $("adminStatDiscussion").textContent = discCount;
    if ($("adminStatUsers")) $("adminStatUsers").textContent = allUsers.length;
}

// Render Overview Tables
function renderOverviewPosts() {
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

function renderOverviewUsers() {
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

// Render Posts Table
function renderPostsTable() {
    const tbody = $("adminPostsTable");
    if (!tbody) return;

    const search = $("postSearchInput")?.value.trim().toLowerCase() || "";
    const filterType = $("postFilterType")?.value || "all";
    const filterCat = $("postFilterCategory")?.value || "all";

    let filtered = [...allPosts];

    if (filterType !== "all") {
        filtered = filtered.filter(p => (p.type || "discussion") === filterType);
    }
    if (filterCat !== "all") {
        filtered = filtered.filter(p => p.category === filterCat);
    }
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

// Render Users Table
function renderUsersTable() {
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
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Không có thành viên nào.</td></tr>`;
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
                <a href="../profile.html?uid=${u.uid}" target="_blank" class="btn btn-sm btn-outline-secondary me-1">Hồ sơ</a>
                <button class="btn btn-sm btn-outline-danger btn-delete-user" data-id="${u.id}">Xóa</button>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".btn-delete-user").forEach(btn => {
        btn.addEventListener("click", () => deleteUser(btn.dataset.id));
    });
}

// Open Edit Post Modal
async function openEditModal(id) {
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

// Submit Edit Post Form
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

// Delete Post
async function deletePost(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
    try {
        await deleteDoc(doc(db, "posts", id));
        showToast("Đã xóa bài viết!");
    } catch (err) {
        console.error("Lỗi xóa bài viết:", err);
        showToast("Không thể xóa bài viết");
    }
}

// Delete User
async function deleteUser(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) return;
    try {
        await deleteDoc(doc(db, "users", id));
        showToast("Đã xóa người dùng!");
    } catch (err) {
        console.error("Lỗi xóa người dùng:", err);
        showToast("Không thể xóa người dùng");
    }
}

// Admin Create New Post Form
$("adminCreatePostForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const type = $("adminPostType").value;
    const category = $("adminPostCategory").value;
    const title = $("adminPostTitle").value.trim();
    const content = $("adminPostContent").value.trim();

    if (!title || !content) return;

    const authorName = currentUser?.displayName || currentUser?.email?.split("@")[0] || "Admin NovaDev";
    const authorId = currentUser?.uid || "admin";

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

// Admin Login Form submit handler
$("adminLoginForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const errEl = $("adminLoginError");
    errEl?.classList.add("d-none");

    const email = $("adminLoginEmail").value.trim();
    const password = $("adminLoginPassword").value;

    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!isAdminUser(cred.user)) {
            if (errEl) {
                errEl.textContent = "Tài khoản của bạn không có quyền Quản trị Admin!";
                errEl.classList.remove("d-none");
            }
            return;
        }
        showToast("Đăng nhập Admin thành công!");
    } catch (err) {
        if (errEl) {
            errEl.textContent = "Email hoặc mật khẩu không đúng!";
            errEl.classList.remove("d-none");
        }
    }
});

// Admin Logout handler
$("btnAdminLogout")?.addEventListener("click", () => {
    signOut(auth).then(() => {
        showToast("Đã đăng xuất tài khoản Admin");
        window.location.reload();
    });
});

// Event Listeners for Filters
$("postSearchInput")?.addEventListener("input", renderPostsTable);
$("postFilterType")?.addEventListener("change", renderPostsTable);
$("postFilterCategory")?.addEventListener("change", renderPostsTable);
$("userSearchInput")?.addEventListener("input", renderUsersTable);

// Auth state listener
onAuthStateChanged(auth, user => {
    currentUser = user;
    const adminUserArea = $("adminUserArea");
    if (adminUserArea) {
        if (user && isAdminUser(user)) {
            const name = user.displayName || user.email.split("@")[0];
            adminUserArea.innerHTML = `<div>Đang đăng nhập: <strong>${escapeHtml(name)}</strong></div>`;
        } else {
            adminUserArea.innerHTML = `<div>Chưa đăng nhập Admin</div>`;
        }
    }
    checkAdminAccess(user);
});

// Initialize Admin Dashboard
initTabs();
initCategorySelects();
