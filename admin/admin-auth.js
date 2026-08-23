// admin-auth.js — Quản lý xác thực và phân quyền Admin

import { auth } from "../js/firebase-config.js";
import {
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { isAdminUser } from "../js/auth.js";
import { $, showToast, escapeHtml } from "./admin-utils.js";

/**
 * Kiểm tra quyền Admin và hiển thị/ẩn giao diện tương ứng
 * @param {import("firebase/auth").User|null} user
 * @param {Function} onGranted - Callback khi được cấp quyền (lần đầu)
 */
export function checkAdminAccess(user, onGranted) {
    const accessDeniedEl = $("adminAccessDenied");
    const wrapperEl = $("adminWrapper");

    if (user && isAdminUser(user)) {
        accessDeniedEl?.classList.add("d-none");
        wrapperEl?.classList.remove("d-none");
        onGranted?.();
    } else {
        accessDeniedEl?.classList.remove("d-none");
        wrapperEl?.classList.add("d-none");

        const msgEl = $("adminDeniedMessage");
        if (msgEl) {
            if (user) {
                msgEl.textContent = `Tài khoản (${user.email}) không có quyền Quản trị Admin! Vui lòng đăng nhập tài khoản Admin.`;
                msgEl.className = "alert alert-danger text-center mb-4";
            } else {
                msgEl.textContent = "Bạn cần đăng nhập bằng tài khoản Quản trị Admin để tiếp tục.";
                msgEl.className = "alert alert-warning text-center mb-4";
            }
        }
    }
}

/**
 * Cập nhật khu vực hiển thị thông tin người dùng Admin ở topbar
 * @param {import("firebase/auth").User|null} user
 */
export function renderAdminUserArea(user) {
    const adminUserArea = $("adminUserArea");
    if (!adminUserArea) return;

    if (user && isAdminUser(user)) {
        const name = user.displayName || user.email.split("@")[0];
        adminUserArea.innerHTML = `<div>Đang đăng nhập: <strong>${escapeHtml(name)}</strong></div>`;
    } else {
        adminUserArea.innerHTML = `<div>Chưa đăng nhập Admin</div>`;
    }
}

/**
 * Khởi tạo form đăng nhập Admin (tại trang bị từ chối truy cập)
 */
export function initAdminLoginForm() {
    $("adminLoginForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const errEl = $("adminLoginError");
        errEl?.classList.add("d-none");

        const email = $("adminLoginEmail").value.trim();
        const password = $("adminLoginPassword").value;

        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            if (!isAdminUser(cred.user)) {
                if (errEl) {
                    errEl.textContent = "Tài khoản của bạn không có quyền Quản trị Admin!";
                    errEl.classList.remove("d-none");
                }
                return;
            }
            showToast("Đăng nhập Admin thành công!");
        } catch (err) {
            if (errEl) {
                errEl.textContent = "Email hoặc mật khẩu không đúng!";
                errEl.classList.remove("d-none");
            }
        }
    });
}

/**
 * Khởi tạo nút Đăng xuất Admin ở topbar
 */
export function initAdminLogout() {
    $("btnAdminLogout")?.addEventListener("click", () => {
        signOut(auth).then(() => {
            showToast("Đã đăng xuất tài khoản Admin");
            window.location.reload();
        });
    });
}

/**
 * Đăng ký lắng nghe trạng thái xác thực Firebase Auth
 * @param {Function} onChange - Callback nhận user khi auth thay đổi
 */
export function initAuthStateListener(onChange) {
    onAuthStateChanged(auth, onChange);
}
