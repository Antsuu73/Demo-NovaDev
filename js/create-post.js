import { collection, addDoc, serverTimestamp, db } from "./firebase-config.js";
import { $, showToast } from "./utils.js";
import { currentUser, openAuthModal } from "./auth.js";

export function openCreateModal(postType = "discussion") {
    if (!currentUser) { openAuthModal("login"); return; }
    const modalEl = $("createModal");
    if (!modalEl) return;

    $("postType").value = postType;
    if (postType === "qa") {
        $("createModalTitle").textContent = "Đặt câu hỏi mới";
        $("createSubmitBtn").textContent = "Gửi câu hỏi";
        $("postTitle").placeholder = "Câu hỏi của bạn là gì?";
        $("postContent").placeholder = "Mô tả chi tiết câu hỏi...";
    } else {
        $("createModalTitle").textContent = "Tạo chủ đề thảo luận";
        $("createSubmitBtn").textContent = "Đăng bài";
        $("postTitle").placeholder = "Tiêu đề chủ đề";
        $("postContent").placeholder = "Nội dung thảo luận...";
    }
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

export function initCreatePost() {
    $("btnCreatePost")?.addEventListener("click", () => {
        const page = document.body.dataset.page;
        openCreateModal(page === "qa" ? "qa" : "discussion");
    });

    $("createForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        if (!currentUser) return;
        const type = $("postType").value;
        try {
            await addDoc(collection(db, "posts"), {
                title: $("postTitle").value.trim(),
                content: $("postContent").value.trim(),
                category: $("postCategory").value,
                type,
                authorName: currentUser.displayName || currentUser.email.split("@")[0],
                authorId: currentUser.uid,
                views: 0,
                likes: 0,
                commentCount: 0,
                likedBy: [],
                createdAt: serverTimestamp()
            });
            $("createForm").reset();
            bootstrap.Modal.getInstance($("createModal"))?.hide();
            showToast(type === "qa" ? "Đã gửi câu hỏi!" : "Đăng bài thành công!");
            window.location.href = type === "qa" ? "qa.html" : "discussion.html";
        } catch {
            showToast("Không thể đăng bài. Vui lòng thử lại.", "❌");
        }
    });
}
