// admin.js — Điểm khởi động chính của Admin Dashboard (Coordinator Module)
// Tổ chức kiến trúc Module hóa: Mỗi nhiệm vụ được tách thành một file riêng biệt

import {
    checkAdminAccess,
    renderAdminUserArea,
    initAdminLoginForm,
    initAdminLogout,
    initAuthStateListener
} from "./admin-auth.js";

import {
    initNavigation
} from "./admin-navigation.js";

import {
    renderStats
} from "./admin-stats.js";

import {
    subscribePosts,
    getAllPosts,
    setCurrentUser,
    renderOverviewPosts,
    renderPostsTable,
    initEditPostForm,
    initCreatePostForm,
    initPostFilters,
    initCategorySelects
} from "./admin-posts.js";

import {
    subscribeUsers,
    getAllUsers,
    renderOverviewUsers,
    renderUsersTable,
    initUserFilters
} from "./admin-users.js";

// Cờ kiểm soát chỉ đăng ký realtime Firestore 1 lần duy nhất khi cấp quyền
let isSubscribed = false;

/**
 * Khởi động đồng bộ dữ liệu thời gian thực từ Firestore cho Posts & Users
 */
function startRealtimeSync() {
    // Lắng nghe dữ liệu bài viết
    subscribePosts(posts => {
        renderStats(posts, getAllUsers());
        renderOverviewPosts();
        renderPostsTable();
    });

    // Lắng nghe dữ liệu thành viên
    subscribeUsers(users => {
        renderStats(getAllPosts(), users);
        renderOverviewUsers();
        renderUsersTable();
    });
}

/**
 * Khởi tạo toàn bộ các phân hệ của trang Quản trị Admin
 */
function initAdminApp() {
    // 1. Khởi tạo thanh điều hướng Tab & Mobile Sidebar
    initNavigation();

    // 2. Nạp dữ liệu danh mục vào các thẻ dropdown
    initCategorySelects(["postFilterCategory", "adminPostCategory", "adminEditCategory"]);

    // 3. Khởi tạo bộ lọc tìm kiếm cho Bài viết và Thành viên
    initPostFilters();
    initUserFilters();

    // 4. Khởi tạo các form tác vụ nghiệp vụ
    initEditPostForm();
    initCreatePostForm();
    initAdminLoginForm();
    initAdminLogout();

    // 5. Lắng nghe trạng thái đăng nhập Firebase Auth và kiểm tra phân quyền
    initAuthStateListener(user => {
        setCurrentUser(user);
        renderAdminUserArea(user);
        checkAdminAccess(user, () => {
            if (!isSubscribed) {
                isSubscribed = true;
                startRealtimeSync();
            }
        });
    });
}

// Chạy ứng dụng khi DOM đã sẵn sàng
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminApp);
} else {
    initAdminApp();
}
