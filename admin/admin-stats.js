// admin-stats.js — Quản lý thống kê số liệu tổng quan hệ thống Admin

import { $ } from "./admin-utils.js";

/**
 * Cập nhật số liệu trên các thẻ thống kê tổng quan (Stat Cards)
 * @param {Array} posts - Danh sách bài viết
 * @param {Array} users - Danh sách thành viên
 */
export function renderStats(posts = [], users = []) {
    const statPostsEl = $("adminStatPosts");
    const statQAEl = $("adminStatQA");
    const statDiscussionEl = $("adminStatDiscussion");
    const statUsersEl = $("adminStatUsers");

    if (statPostsEl) statPostsEl.textContent = posts.length;

    const qaCount = posts.filter(p => p.type === "qa").length;
    const discCount = posts.filter(p => (p.type || "discussion") === "discussion").length;

    if (statQAEl) statQAEl.textContent = qaCount;
    if (statDiscussionEl) statDiscussionEl.textContent = discCount;
    if (statUsersEl) statUsersEl.textContent = users.length;
}
