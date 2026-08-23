import { initCommon, currentUser } from "./init.js";
import { $, escapeHtml, avatarInitial, showToast, formatDate } from "./utils.js";
import { renderListCard, bindPostClicks, getPostType } from "./post-ui.js";
import {
    auth, db, doc, getDoc, updateDoc, setDoc, deleteDoc, collection, query, where, getDocs, orderBy
} from "./firebase-config.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

initCommon();

let targetUid = null;
let currentProfileData = null;

function getTargetUid() {
    const params = new URLSearchParams(window.location.search);
    return params.get("uid") || currentUser?.uid;
}

function setupTabs() {
    const tabsContainer = $("profileTabs");
    if (!tabsContainer) return;

    tabsContainer.addEventListener("click", e => {
        const btn = e.target.closest("[data-tab]");
        if (!btn) return;

        const tab = btn.dataset.tab;
        tabsContainer.querySelectorAll(".nav-link").forEach(el => el.classList.remove("active"));
        btn.classList.add("active");

        $("panePosts")?.classList.toggle("d-none", tab !== "posts");
        $("paneEdit")?.classList.toggle("d-none", tab !== "edit");
    });

    $("btnQuickEdit")?.addEventListener("click", () => {
        const editTabBtn = tabsContainer.querySelector("[data-tab='edit']");
        if (editTabBtn) editTabBtn.click();
    });
}

function renderProfileHeader(userData, isSelf) {
    const name = userData.displayName || userData.email?.split("@")[0] || "Người dùng NovaDev";
    $("profileName").textContent = name;
    
    // Avatar
    const avatarContainer = $("profileAvatarContainer");
    if (avatarContainer) {
        if (userData.photoURL) {
            avatarContainer.innerHTML = `<img src="${escapeHtml(userData.photoURL)}" class="profile-avatar-lg" alt="${escapeHtml(name)}">`;
        } else {
            avatarContainer.innerHTML = `<span class="profile-avatar-lg">${avatarInitial(name)}</span>`;
        }
    }

    // Bio
    $("profileBio").textContent = userData.bio || "Chưa có thông tin giới thiệu.";

    // Meta
    $("profileEmail").textContent = `Email: ${userData.email || "Ẩn email"}`;
    
    const joinedDate = userData.createdAt ? formatDate(userData.createdAt) : "Gần đây";
    $("profileJoined").textContent = `Tham gia: ${joinedDate}`;
    
    const providerName = userData.provider === "google.com" ? "Google" : "Email & Mật khẩu";
    $("profileProvider").textContent = `Đăng nhập: ${providerName}`;

    // GitHub & Website links
    const githubSpan = $("profileGithub");
    const githubLink = $("githubLink");
    if (userData.github && githubSpan && githubLink) {
        githubLink.href = userData.github;
        githubSpan.classList.remove("d-none");
    } else if (githubSpan) {
        githubSpan.classList.add("d-none");
    }

    const websiteSpan = $("profileWebsite");
    const websiteLink = $("websiteLink");
    if (userData.website && websiteSpan && websiteLink) {
        websiteLink.href = userData.website;
        websiteSpan.classList.remove("d-none");
    } else if (websiteSpan) {
        websiteSpan.classList.add("d-none");
    }

    // Self controls
    $("btnQuickEdit")?.classList.toggle("d-none", !isSelf);
    $("tabItemEdit")?.classList.toggle("d-none", !isSelf);

    // Pre-fill Edit Form if self
    if (isSelf) {
        if ($("editDisplayName")) $("editDisplayName").value = userData.displayName || "";
        if ($("editPhotoURL")) $("editPhotoURL").value = userData.photoURL || "";
        if ($("editBio")) $("editBio").value = userData.bio || "";
        if ($("editGithub")) $("editGithub").value = userData.github || "";
        if ($("editWebsite")) $("editWebsite").value = userData.website || "";
    }
}

async function loadProfileData(uid) {
    $("pageLoading")?.classList.remove("d-none");
    const isSelf = currentUser && currentUser.uid === uid;

    try {
        const userDocRef = doc(db, "users", uid);
        const snap = await getDoc(userDocRef);
        
        if (snap.exists()) {
            currentProfileData = snap.data();
        } else if (isSelf) {
            currentProfileData = {
                uid: currentUser.uid,
                displayName: currentUser.displayName || currentUser.email.split("@")[0],
                email: currentUser.email,
                photoURL: currentUser.photoURL,
                provider: currentUser.providerData[0]?.providerId || "password"
            };
        } else {
            currentProfileData = {
                displayName: "Thành viên NovaDev",
                email: "",
                bio: "Tài khoản không tìm thấy hoặc đã bị xóa."
            };
        }

        renderProfileHeader(currentProfileData, isSelf);
        await loadUserPosts(uid);
    } catch (err) {
        console.error("Lỗi khi tải thông tin hồ sơ:", err);
        showToast("Không thể tải thông tin hồ sơ", "⚠️");
    } finally {
        $("pageLoading")?.classList.add("d-none");
    }
}

async function loadUserPosts(uid) {
    const listEl = $("userPostsList");
    const emptyEl = $("userPostsEmpty");
    if (!listEl) return;

    try {
        const q = query(
            collection(db, "posts"),
            where("authorId", "==", uid)
        );
        const snap = await getDocs(q);

        let totalPosts = 0;
        let totalComments = 0;
        let totalLikes = 0;
        const posts = [];

        snap.docs.forEach(docSnap => {
            const data = docSnap.data();
            totalPosts++;
            totalComments += data.commentCount || 0;
            totalLikes += data.likes || 0;
            posts.push({ id: docSnap.id, ...data });
        });

        // Update stats
        if ($("userStatPosts")) $("userStatPosts").textContent = totalPosts;
        if ($("userStatComments")) $("userStatComments").textContent = totalComments;
        if ($("userStatLikes")) $("userStatLikes").textContent = totalLikes;

        if (posts.length === 0) {
            listEl.innerHTML = "";
            emptyEl?.classList.remove("d-none");
            return;
        }

        emptyEl?.classList.add("d-none");
        
        // Sort newest first
        posts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        const isSelf = currentUser && currentUser.uid === uid;

        listEl.innerHTML = posts.map(post => {
            const cardHtml = renderListCard(post, getPostType(post));
            if (!isSelf) return cardHtml;
            return `
                <div class="position-relative mb-2">
                    ${cardHtml}
                    <div class="position-absolute top-0 end-0 p-3 d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary btn-edit-post bg-white shadow-sm" data-id="${post.id}">Sửa</button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-post bg-white shadow-sm" data-id="${post.id}">Xóa</button>
                    </div>
                </div>`;
        }).join("");

        bindPostClicks(listEl, "profile");

        if (isSelf) {
            bindOwnerPostActions(listEl, posts, uid);
        }
    } catch (err) {
        console.error("Lỗi khi tải bài viết của người dùng:", err);
    }
}

function bindOwnerPostActions(container, posts, uid) {
    container.querySelectorAll(".btn-edit-post").forEach(btn => {
        btn.addEventListener("click", e => {
            e.stopPropagation();
            const postId = btn.dataset.id;
            const post = posts.find(p => p.id === postId);
            if (!post) return;
            const modalEl = $("editPostModal");
            if (!modalEl) return;
            $("editPostId").value = post.id;
            $("editPostTitle").value = post.title || "";
            $("editPostCategory").value = post.category || "";
            $("editPostContent").value = post.content || "";
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        });
    });

    container.querySelectorAll(".btn-delete-post").forEach(btn => {
        btn.addEventListener("click", async e => {
            e.stopPropagation();
            const postId = btn.dataset.id;
            if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
            try {
                await deleteDoc(doc(db, "posts", postId));
                showToast("Đã xóa bài viết!");
                loadUserPosts(uid);
            } catch (err) {
                console.error("Lỗi khi xóa bài viết:", err);
                showToast("Không thể xóa bài viết: " + err.message, "❌");
            }
        });
    });
}

function initEditProfileForm() {
    const form = $("editProfileForm");
    if (!form) return;

    form.addEventListener("submit", async e => {
        e.preventDefault();
        if (!currentUser) {
            showToast("Vui lòng đăng nhập để thực hiện", "⚠️");
            return;
        }

        const btnSave = $("btnSaveProfile");
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.textContent = "Đang lưu...";
        }

        const newName = $("editDisplayName").value.trim();
        const newPhotoURL = $("editPhotoURL").value.trim() || null;
        const newBio = $("editBio").value.trim();
        const newGithub = $("editGithub").value.trim();
        const newWebsite = $("editWebsite").value.trim();

        try {
            // 1. Update Firebase Auth Profile
            await updateProfile(auth.currentUser, {
                displayName: newName,
                photoURL: newPhotoURL
            });

            // 2. Update Firestore user document
            const userRef = doc(db, "users", currentUser.uid);
            const updatePayload = {
                displayName: newName,
                photoURL: newPhotoURL,
                bio: newBio,
                github: newGithub,
                website: newWebsite,
                updatedAt: new Date()
            };

            await setDoc(userRef, updatePayload, { merge: true });

            // 3. Update local state & re-render
            currentProfileData = { ...currentProfileData, ...updatePayload };
            renderProfileHeader(currentProfileData, true);

            showToast("Cập nhật hồ sơ thành công!", "🎉");

            // Switch back to posts tab
            const postsTabBtn = $("profileTabs")?.querySelector("[data-tab='posts']");
            if (postsTabBtn) postsTabBtn.click();
        } catch (err) {
            console.error("Lỗi khi cập nhật hồ sơ:", err);
            showToast("Có lỗi xảy ra khi lưu: " + err.message, "❌");
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.textContent = "💾 Lưu thay đổi";
            }
        }
    });
}

function initEditPostForm() {
    const form = $("editPostForm");
    if (!form) return;

    form.addEventListener("submit", async e => {
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
                updatedAt: new Date()
            });

            const modalEl = $("editPostModal");
            if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

            showToast("Cập nhật bài viết thành công!");
            if (currentUser) loadUserPosts(currentUser.uid);
        } catch (err) {
            console.error("Lỗi khi sửa bài viết:", err);
            showToast("Không thể cập nhật bài viết: " + err.message, "❌");
        }
    });
}

// Initializer
setupTabs();
initEditProfileForm();
initEditPostForm();

window.addEventListener("auth-changed", e => {
    const uid = getTargetUid();
    if (uid) {
        loadProfileData(uid);
    } else {
        $("pageLoading")?.classList.add("d-none");
        $("profileName").textContent = "Vui lòng đăng nhập";
        $("profileBio").textContent = "Bạn cần đăng nhập để xem thông tin cá nhân của mình.";
    }
});

// Also check URL param directly on page load
const initialUid = getTargetUid();
if (initialUid) {
    loadProfileData(initialUid);
}
