import { initCommon } from "./init.js";
import { setActiveNav, subscribePosts, showToast, bindPostClicks, getPostType, escapeHtml, avatarInitial, getCategoryName, getCategoryIcon, getTypeName, getTypeIcon, currentUser } from "./common.js";
import { $ } from "./utils.js";

function syncSidebarStats(stats) {
    if (!stats) return;
    const sidePosts = $("sideStatPosts");
    const sideMembers = $("sideStatMembers");
    const sideComments = $("sideStatComments");
    if (sidePosts) sidePosts.textContent = stats.posts ?? 0;
    if (sideMembers) sideMembers.textContent = stats.members ?? 0;
    if (sideComments) sideComments.textContent = stats.comments ?? 0;
}

initCommon(syncSidebarStats);
setActiveNav("home");

function renderSkeleton() {
    const grid = $("featuredGrid");
    if (!grid) return;
    grid.innerHTML = `
        <div class="skeleton-card">
            <div class="skeleton-line small"></div>
            <div class="skeleton-line large"></div>
            <div class="skeleton-line full"></div>
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line small"></div>
        </div>
        <div class="skeleton-card">
            <div class="skeleton-line small"></div>
            <div class="skeleton-line large"></div>
            <div class="skeleton-line full"></div>
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line small"></div>
        </div>
        <div class="skeleton-card">
            <div class="skeleton-line small"></div>
            <div class="skeleton-line large"></div>
            <div class="skeleton-line full"></div>
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line small"></div>
        </div>
    `;
}

function renderFeatured(posts) {
    const grid = $("featuredGrid");
    const empty = $("featuredEmpty");
    $("pageLoading")?.classList.add("d-none");

    const featured = [...posts]
        .sort((a, b) => ((b.likes || 0) + (b.views || 0)) - ((a.likes || 0) + (a.views || 0)))
        .slice(0, 8);

    if (featured.length === 0) {
        grid.innerHTML = "";
        empty?.classList.remove("d-none");
        return;
    }
    empty?.classList.add("d-none");

    grid.innerHTML = featured.map(post => {
        const type = getPostType(post);
        const typeClass = type === "qa" ? "type-qa" : "type-discussion";
        const liked = currentUser && (post.likedBy || []).includes(currentUser.uid);
        return `
            <div class="featured-card ${typeClass}" data-id="${post.id}">
                <div class="featured-card-top">
                    <span class="featured-type-badge">${getTypeIcon(type)} ${getTypeName(type)}</span>
                    <span class="featured-category">${getCategoryIcon(post.category)} ${getCategoryName(post.category)}</span>
                </div>
                <h3 class="featured-card-title">${escapeHtml(post.title)}</h3>
                <p class="featured-card-excerpt">${escapeHtml(post.content.substring(0, 100))}${post.content.length > 100 ? "..." : ""}</p>
                <div class="featured-card-footer">
                    <span class="featured-author">${avatarInitial(post.authorName)} ${escapeHtml(post.authorName)}</span>
                    <div class="featured-stats">
                        <button class="btn-like-inline ${liked ? "liked" : ""}" data-like-id="${post.id}">
                            <span>${liked ? "Đã thích" : "Thích"}</span> (${post.likes || 0})
                        </button>
                        <span>Bình luận: ${post.commentCount || 0}</span>
                    </div>
                </div>
            </div>`;
    }).join("");

    bindPostClicks(grid, "home");
}

renderSkeleton();

subscribePosts(renderFeatured, err => {
    $("pageLoading")?.classList.add("d-none");
    showToast(err.code === "permission-denied" ? "Không có quyền đọc Firestore" : "Lỗi tải dữ liệu", "⚠️");
});