// admin-navigation.js — Quản lý chuyển đổi Tab, Tiêu đề trang & Menu Sidebar

import { $ } from "./admin-utils.js";

const PAGE_TITLES = {
    overview: "Tổng quan hệ thống",
    posts: "Quản lý Bài viết",
    users: "Quản lý Thành viên",
    create: "Đăng bài viết mới từ Admin"
};

/**
 * Chuyển tab hiển thị theo tên tab
 * @param {string} tab - 'overview' | 'posts' | 'users' | 'create'
 */
export function switchTab(tab) {
    const sidebar = $("adminSidebar");
    if (!sidebar) return;

    // Cập nhật trạng thái active của nút sidebar
    sidebar.querySelectorAll("[data-tab]").forEach(el => {
        el.classList.toggle("active", el.dataset.tab === tab);
    });

    // Ẩn tất cả panes và hiển thị pane được chọn
    document.querySelectorAll(".tab-pane-content").forEach(pane => pane.classList.add("d-none"));

    if (tab === "overview") $("paneOverview")?.classList.remove("d-none");
    else if (tab === "posts") $("panePosts")?.classList.remove("d-none");
    else if (tab === "users") $("paneUsers")?.classList.remove("d-none");
    else if (tab === "create") $("paneCreate")?.classList.remove("d-none");

    // Đổi tiêu đề topbar
    const pageTitle = $("pageTitle");
    if (pageTitle) {
        pageTitle.textContent = PAGE_TITLES[tab] || "Quản trị hệ thống";
    }

    // Đóng sidebar trên thiết bị di động sau khi chọn tab
    if (window.innerWidth < 768) {
        sidebar.classList.remove("show");
    }
}

/**
 * Khởi tạo sự kiện chuyển tab và đóng mở sidebar
 */
export function initNavigation() {
    const sidebar = $("adminSidebar");
    if (!sidebar) return;

    sidebar.addEventListener("click", e => {
        const btn = e.target.closest("[data-tab]");
        if (!btn) return;
        switchTab(btn.dataset.tab);
    });

    // Nút "Xem tất cả" ở tab Tổng quan -> nhảy sang tab Quản lý Bài viết
    $("btnViewAllPosts")?.addEventListener("click", () => {
        switchTab("posts");
    });

    // Nút bật/tắt sidebar trên thiết bị di động
    $("btnToggleSidebar")?.addEventListener("click", () => {
        sidebar.classList.toggle("show");
    });
}
