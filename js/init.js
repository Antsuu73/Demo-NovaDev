import { initAuth, openAuthModal, currentUser, isAdminUser } from "./auth.js";
import { initCreatePost, openCreateModal } from "./create-post.js";
import { initCategorySelect, loadStats, subscribePosts } from "./posts-service.js";

export function initCommon(onStats) {
    initCategorySelect();
    initAuth();
    initCreatePost();
    loadStats(onStats);
}

export { currentUser, openAuthModal, openCreateModal, subscribePosts, isAdminUser };
