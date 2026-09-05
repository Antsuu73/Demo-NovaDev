import { initCommon } from "./init.js";
import { showToast, openAuthModal, escapeHtml, avatarInitial, formatDate, getPostType, currentUser, getCategoryName, getCategoryIcon, getTypeName, getTypeIcon, db, doc, getDoc, updateDoc, deleteDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, increment, toggleLikePost } from "./common.js";
import { $ } from "./utils.js";

initCommon();

const params = new URLSearchParams(window.location.search);
const postId = params.get("id");
const fromPage = params.get("from") || "home";

const BACK_URLS = { home: "index.html", qa: "qa.html", discussion: "discussion.html" };

const btnBack = $("btnBack");
if (btnBack) btnBack.href = BACK_URLS[fromPage] || "index.html";


if (!postId) {
    showToast("Không tìm thấy bài viết", "❌");
    setTimeout(() => { window.location.href = "index.html"; }, 1500);
} else {
    loadPost(postId);
}

let unsubscribeComments = null;

async function loadPost(id) {
    const snap = await getDoc(doc(db, "posts", id));
    if (!snap.exists()) {
        showToast("Bài viết không tồn tại", "❌");
        setTimeout(() => { window.location.href = BACK_URLS[fromPage] || "index.html"; }, 1500);
        return;
    }

    const post = { id: snap.id, ...snap.data() };
    await updateDoc(doc(db, "posts", id), { views: increment(1) });

    const type = getPostType(post);
    const isOwner = currentUser?.uid === post.authorId;
    const liked = currentUser && (post.likedBy || []).includes(currentUser.uid);

    $("postDetail").innerHTML = `
        <div class="post-detail-header">
            <div class="d-flex gap-2 flex-wrap mb-2">
                <span class="featured-type-badge ${type === "qa" ? "type-qa" : "type-discussion"}">${getTypeIcon(type)} ${getTypeName(type)}</span>
                <span class="post-category-badge">${getCategoryIcon(post.category)} ${getCategoryName(post.category)}</span>
            </div>
            <h1>${escapeHtml(post.title)}</h1>
            <div class="post-detail-meta">
                <span class="post-avatar-lg">${avatarInitial(post.authorName)}</span>
                <div>
                    <strong>${escapeHtml(post.authorName)}</strong>
                    <span class="text-muted ms-2">${formatDate(post.createdAt)}</span>
                </div>
                <div class="ms-auto d-flex gap-2">
                    <button class="btn btn-sm btn-like ${liked ? "liked" : ""}" id="btnLike">
                        ${liked ? "Đã thích" : "Thích"} (${post.likes || 0})
                    </button>
                    ${isOwner ? `
                        <button class="btn btn-sm btn-outline-primary ms-1" id="btnEditPost">Sửa</button>
                        <button class="btn btn-sm btn-outline-danger" id="btnDeletePost">Xóa</button>
                    ` : ""}
                </div>
            </div>
        </div>
        <div class="post-detail-content">${escapeHtml(post.content).replace(/\n/g, "<br>")}</div>
        <div class="post-detail-stats">
            <span>Lượt xem: ${(post.views || 0) + 1}</span>
            <span>Bình luận: ${post.commentCount || 0}</span>
        </div>`;

    $("btnLike")?.addEventListener("click", async () => {
        const success = await toggleLikePost(id);
        if (success) loadPost(id);
    });

    $("btnEditPost")?.addEventListener("click", () => {
        if (!isOwner) return;
        const modalEl = $("editPostModal");
        if (!modalEl) return;
        $("editPostId").value = post.id;
        $("editPostTitle").value = post.title || "";
        $("editPostCategory").value = post.category || "";
        $("editPostContent").value = post.content || "";
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });

    $("btnDeletePost")?.addEventListener("click", async () => {
        if (!isOwner) return;
        if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
        await deleteDoc(doc(db, "posts", id));
        showToast("Đã xóa bài viết");
        window.location.href = BACK_URLS[fromPage] || "index.html";
    });

    loadComments(id);
    updateCommentForm();
}

function updateCommentForm() {
    const showForm = !!currentUser;
    $("commentForm")?.classList.toggle("d-none", !showForm);
    $("commentLoginPrompt")?.classList.toggle("d-none", showForm);
}

window.addEventListener("auth-changed", updateCommentForm);

function loadComments(id) {
    if (unsubscribeComments) unsubscribeComments();
    unsubscribeComments = onSnapshot(
        query(collection(db, "posts", id, "comments"), orderBy("createdAt", "asc")),
        snap => {
            const comments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            $("commentCount").textContent = comments.length;
            $("commentsList").innerHTML = comments.length === 0
                ? `<p class="text-muted">Chưa có bình luận nào. Hãy là người đầu tiên!</p>`
                : comments.map(c => `
                    <div class="comment-item">
                        <div class="comment-avatar">${avatarInitial(c.authorName)}</div>
                        <div class="comment-body">
                            <div class="comment-header">
                                <strong>${escapeHtml(c.authorName)}</strong>
                                <span class="text-muted">${formatDate(c.createdAt)}</span>
                            </div>
                            <p>${escapeHtml(c.content)}</p>
                        </div>
                    </div>`).join("");
        }
    );
}

$("commentForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUser || !postId) return;
    const content = $("commentInput").value.trim();
    if (!content) return;
    try {
        await addDoc(collection(db, "posts", postId, "comments"), {
            content,
            authorName: currentUser.displayName || currentUser.email.split("@")[0],
            authorId: currentUser.uid,
            createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, "posts", postId), { commentCount: increment(1) });
        $("commentInput").value = "";
        showToast("Đã gửi bình luận!");
    } catch {
        showToast("Không thể gửi bình luận", "❌");
    }
});

$("editPostForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const id = $("editPostId").value;
    if (!id || !currentUser) return;

    const title = $("editPostTitle").value.trim();
    const category = $("editPostCategory").value;
    const content = $("editPostContent").value.trim();

    try {
        await updateDoc(doc(db, "posts", id), {
            title,
            category,
            content,
            updatedAt: serverTimestamp()
        });

        const modalEl = $("editPostModal");
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

        showToast("Cập nhật bài viết thành công!");
        loadPost(id);
    } catch (err) {
        console.error("Lỗi khi sửa bài viết:", err);
        showToast("Không thể cập nhật bài viết: " + err.message, "❌");
    }
});
