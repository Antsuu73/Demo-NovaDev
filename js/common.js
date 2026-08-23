/** Barrel file — re-export các module dùng chung */
export { $, escapeHtml, avatarInitial, userAvatarHtml, formatDate, showToast, setActiveNav } from "./utils.js";
export { getPostType, sortPosts, goToPost, renderListCard, bindPostClicks, getCategoryName, getCategoryIcon, getTypeName, getTypeIcon } from "./post-ui.js";
export { initCommon, currentUser, openAuthModal, openCreateModal, subscribePosts, isAdminUser } from "./init.js";
export { loadStats, toggleLikePost } from "./posts-service.js";
export {
    db, collection, addDoc, doc, getDoc, updateDoc, deleteDoc,
    query, orderBy, onSnapshot, serverTimestamp, increment
} from "./firebase-config.js";
