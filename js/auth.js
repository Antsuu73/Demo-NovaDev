import {
    auth, db, collection, doc, getDoc, setDoc, serverTimestamp
} from "./firebase-config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { $, escapeHtml, userAvatarHtml, showToast } from "./utils.js";
import { trySeedPosts } from "./posts-service.js";

export let currentUser = null;

async function ensureUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            displayName: user.displayName || user.email.split("@")[0],
            email: user.email,
            photoURL: user.photoURL || null,
            provider: user.providerData[0]?.providerId || "email",
            createdAt: serverTimestamp()
        });
    }
}

function translateAuthError(code) {
    const map = {
        "auth/email-already-in-use": "Email đã được sử dụng",
        "auth/invalid-email": "Email không hợp lệ",
        "auth/weak-password": "Mật khẩu quá yếu (tối thiểu 6 ký tự)",
        "auth/user-not-found": "Tài khoản không tồn tại",
        "auth/wrong-password": "Mật khẩu không đúng",
        "auth/invalid-credential": "Email hoặc mật khẩu không đúng",
        "auth/popup-blocked": "Trình duyệt đã chặn cửa sổ đăng nhập Google",
        "auth/account-exists-with-different-credential": "Email đã đăng ký bằng phương thức khác"
    };
    return map[code] || "Có lỗi xảy ra, vui lòng thử lại";
}

// Danh sách email được cấp quyền Admin
const ADMIN_EMAILS = [
    "trungbell@gmail.com"
];

export function isAdminUser(user) {
    if (!user) return false;
    const email = (user.email || "").toLowerCase();
    return ADMIN_EMAILS.includes(email) || email.includes("admin");
}

function renderAuthArea() {
    const authArea = $("authArea");
    const btnCreate = $("btnCreatePost");
    if (!authArea) return;

    if (currentUser) {
        const name = currentUser.displayName || currentUser.email.split("@")[0];
        const isAdmin = isAdminUser(currentUser);
        authArea.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-user dropdown-toggle" data-bs-toggle="dropdown">
                    ${userAvatarHtml(currentUser)}
                    ${escapeHtml(name)}
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="profile.html">Trang cá nhân</a></li>
                    ${isAdmin ? `<li><a class="dropdown-item fw-bold text-primary" href="admin/index.html">Quản trị Admin</a></li>` : ""}
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" id="btnLogout">Đăng xuất</a></li>
                </ul>
            </div>`;
        $("btnLogout").addEventListener("click", e => {
            e.preventDefault();
            signOut(auth).then(() => showToast("Đã đăng xuất"));
        });
        btnCreate?.classList.remove("d-none");
    } else {
        authArea.innerHTML = `<button class="btn btn-outline-primary btn-sm" id="btnLogin">Đăng nhập</button>`;
        $("btnLogin").addEventListener("click", () => openAuthModal("login"));
        btnCreate?.classList.add("d-none");
    }
}

export function openAuthModal(tab = "login") {
    const modalEl = $("authModal");
    if (!modalEl) return;
    const isLogin = tab === "login";
    $("authModalTitle").textContent = isLogin ? "Đăng nhập" : "Đăng ký";
    $("loginForm").classList.toggle("d-none", !isLogin);
    $("registerForm").classList.toggle("d-none", isLogin);
    document.querySelectorAll("#authTabs .nav-link").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    $("authError")?.classList.add("d-none");
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

export function initAuth() {
    $("authTabs")?.addEventListener("click", e => {
        const btn = e.target.closest("[data-tab]");
        if (btn) openAuthModal(btn.dataset.tab);
    });

    $("btnGoogleLogin")?.addEventListener("click", async () => {
        const errEl = $("authError");
        errEl?.classList.add("d-none");
        try {
            const result = await signInWithPopup(auth, new GoogleAuthProvider());
            await ensureUserProfile(result.user);
            bootstrap.Modal.getInstance($("authModal"))?.hide();
            showToast("Đăng nhập Google thành công!");
        } catch (err) {
            if (err.code === "auth/popup-closed-by-user") return;
            if (errEl) {
                errEl.textContent = translateAuthError(err.code);
                errEl.classList.remove("d-none");
            }
        }
    });

    $("loginForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const errEl = $("authError");
        errEl?.classList.add("d-none");
        try {
            await signInWithEmailAndPassword(auth, $("loginEmail").value, $("loginPassword").value);
            bootstrap.Modal.getInstance($("authModal"))?.hide();
            showToast("Đăng nhập thành công!");
        } catch (err) {
            if (errEl) {
                errEl.textContent = translateAuthError(err.code);
                errEl.classList.remove("d-none");
            }
        }
    });

    $("registerForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const errEl = $("authError");
        errEl?.classList.add("d-none");
        try {
            const cred = await createUserWithEmailAndPassword(
                auth, $("registerEmail").value, $("registerPassword").value
            );
            await updateProfile(cred.user, { displayName: $("registerName").value });
            await setDoc(doc(db, "users", cred.user.uid), {
                uid: cred.user.uid,
                displayName: $("registerName").value,
                email: $("registerEmail").value,
                photoURL: null,
                provider: "password",
                createdAt: serverTimestamp()
            });
            bootstrap.Modal.getInstance($("authModal"))?.hide();
            showToast("Đăng ký thành công!");
        } catch (err) {
            if (errEl) {
                errEl.textContent = translateAuthError(err.code);
                errEl.classList.remove("d-none");
            }
        }
    });

    $("commentLoginLink")?.addEventListener("click", e => {
        e.preventDefault();
        openAuthModal("login");
    });

    onAuthStateChanged(auth, user => {
        currentUser = user;
        renderAuthArea();
        window.dispatchEvent(new CustomEvent("auth-changed", { detail: user }));
        if (user) trySeedPosts(user);
    });
}
