import {
    getCategoryName, getCategoryIcon, getTypeName, getTypeIcon
} from "./data.js";
import { escapeHtml, avatarInitial, formatDate } from "./utils.js";
import { currentUser } from "./auth.js";
import { toggleLikePost } from "./posts-service.js";

export function getPostType(post) {
    return post.type || "discussion";
}

export function sortPosts(list, sortKey) {
    const copy = [...list];
    if (sortKey === "popular") copy.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    else if (sortKey === "comments") copy.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
    return copy;
}

export function goToPost(id, from = "home") {
    window.location.href = `post.html?id=${encodeURIComponent(id)}&from=${from}`;
}

export function renderListCard(post, type) {
    const liked = currentUser && (post.likedBy || []).includes(currentUser.uid);
    return `
        <div class="list-card" data-id="${post.id}">
            <div class="list-card-body">
                <div class="list-card-meta">
                    <span class="post-category-badge">${getCategoryIcon(post.category)} ${getCategoryName(post.category)}</span>
                    <span class="post-author">${post.authorId ? `<a href="profile.html?uid=${post.authorId}" class="author-link" onclick="event.stopPropagation()">${escapeHtml(post.authorName)}</a>` : escapeHtml(post.authorName)}</span>
                    <span class="post-time">${formatDate(post.createdAt)}</span>
                </div>
                <h3 class="list-card-title">${escapeHtml(post.title)}</h3>
                <p class="list-card-excerpt">${escapeHtml(post.content.substring(0, 180))}${post.content.length > 180 ? "..." : ""}</p>
                <div class="post-stats">
                    <span>Lượt xem: ${post.views || 0}</span>
                    <button class="btn-like-inline ${liked ? "liked" : ""}" data-like-id="${post.id}">
                        <span>${liked ? "Đã thích" : "Thích"}</span> (${post.likes || 0})
                    </button>
                    <span>Bình luận: ${post.commentCount || 0}</span>
                </div>
            </div>
        </div>`;
}

export function bindPostClicks(container, from) {
    if (!container) return;
    container.querySelectorAll("[data-id]").forEach(el => {
        el.addEventListener("click", (e) => {
            if (e.target.closest("[data-like-id]") || e.target.closest("a")) return;
            goToPost(el.dataset.id, from);
        });
    });

    container.querySelectorAll("[data-like-id]").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const postId = btn.dataset.likeId;
            await toggleLikePost(postId);
        });
    });
}

export { getCategoryName, getCategoryIcon, getTypeName, getTypeIcon };
