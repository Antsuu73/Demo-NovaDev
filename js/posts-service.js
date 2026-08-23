import {
    db, collection, addDoc, getDocs, doc, getDoc, updateDoc, increment, query, orderBy, onSnapshot, serverTimestamp
} from "./firebase-config.js";
import { SAMPLE_POSTS, SAMPLE_COMMENTS, CATEGORIES } from "./data.js";
import { $, showToast } from "./utils.js";
import { currentUser, openAuthModal } from "./auth.js";

let seedAttempted = false;

export async function trySeedPosts(user) {
    if (seedAttempted || !user) return;
    seedAttempted = true;

    try {
        const snap = await getDocs(collection(db, "posts"));
        if (!snap.empty) return;

        for (const post of SAMPLE_POSTS) {
            const ref = await addDoc(collection(db, "posts"), {
                title: post.title,
                content: post.content,
                category: post.category,
                type: post.type || "discussion",
                authorName: post.authorName,
                authorId: user.uid,
                views: post.views || 0,
                likes: post.likes || 0,
                commentCount: post.commentCount || 0,
                createdAt: serverTimestamp(),
                likedBy: []
            });
            const count = Math.min(post.commentCount || 0, 3);
            for (let i = 0; i < count; i++) {
                await addDoc(collection(db, "posts", ref.id, "comments"), {
                    ...SAMPLE_COMMENTS[i % SAMPLE_COMMENTS.length],
                    authorId: user.uid,
                    createdAt: serverTimestamp()
                });
            }
        }
        showToast("Đã tải dữ liệu mẫu!", "📦");
    } catch (err) {
        console.warn("Không thể seed dữ liệu mẫu:", err.message);
    }
}

export function loadStats(onStats) {
    const stats = { posts: 0, members: 0, comments: 0 };
    let postsLoaded = false;
    let usersLoaded = false;

    const emit = () => {
        if (postsLoaded && usersLoaded && onStats) onStats(stats);
    };

    if ($("statMembers") || onStats) {
        onSnapshot(collection(db, "users"), snap => {
            stats.members = snap.size || 0;
            if ($("statMembers")) $("statMembers").textContent = stats.members;
            usersLoaded = true;
            emit();
        }, err => {
            console.warn("users stats:", err.message);
            usersLoaded = true;
            emit();
        });
    } else {
        usersLoaded = true;
    }

    if ($("statPosts") || onStats) {
        onSnapshot(collection(db, "posts"), snap => {
            stats.posts = snap.size;
            let total = 0;
            snap.docs.forEach(d => { total += d.data().commentCount || 0; });
            stats.comments = total;
            if ($("statPosts")) $("statPosts").textContent = stats.posts;
            if ($("statComments")) $("statComments").textContent = stats.comments;
            postsLoaded = true;
            emit();
        }, err => {
            console.warn("posts stats:", err.message);
            postsLoaded = true;
            emit();
        });
    } else {
        postsLoaded = true;
    }
}

export function subscribePosts(onData, onError) {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
        onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, onError);
}

export function initCategorySelect(elementIds = ["postCategory", "editPostCategory"]) {
    elementIds.forEach(id => {
        const select = $(id);
        if (!select || select.options.length > 0) return;
        CATEGORIES.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = `${cat.icon} ${cat.name}`;
            select.appendChild(opt);
        });
    });
}

export async function toggleLikePost(postId) {
    if (!currentUser) {
        openAuthModal("login");
        return false;
    }
    try {
        const postRef = doc(db, "posts", postId);
        const snap = await getDoc(postRef);
        if (!snap.exists()) return false;
        const postData = snap.data();
        const likedBy = postData.likedBy || [];
        const alreadyLiked = likedBy.includes(currentUser.uid);
        await updateDoc(postRef, {
            likes: increment(alreadyLiked ? -1 : 1),
            likedBy: alreadyLiked
                ? likedBy.filter(uid => uid !== currentUser.uid)
                : [...likedBy, currentUser.uid]
        });
        showToast(alreadyLiked ? "Đã bỏ thích bài viết" : "Đã thích bài viết! ❤️");
        return true;
    } catch (err) {
        console.error("Lỗi khi thích bài viết:", err);
        showToast("Không thể thực hiện hành động này", "❌");
        return false;
    }
}

