import { initCommon } from "./init.js";
import { setActiveNav, subscribePosts, showToast, bindPostClicks, getPostType, sortPosts, renderListCard } from "./common.js";
import { CATEGORIES } from "./data.js";
import { $ } from "./utils.js";

initCommon();
setActiveNav("discussion");

let allPosts = [];
let discussionCategory = "all";

function initCategoryChips() {
    $("discussionCategories").innerHTML = `
        <div class="col-auto"><div class="category-chip active" data-cat="all">🌐 Tất cả</div></div>
        ${CATEGORIES.map(cat => `
            <div class="col-auto"><div class="category-chip" data-cat="${cat.id}">${cat.icon} ${cat.name}</div></div>
        `).join("")}`;

    $("discussionCategories").querySelectorAll(".category-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            discussionCategory = chip.dataset.cat;
            $("discussionCategories").querySelectorAll(".category-chip").forEach(c =>
                c.classList.toggle("active", c.dataset.cat === discussionCategory)
            );
            render();
        });
    });
}

function render() {
    const search = $("discussionSearchInput").value.trim().toLowerCase();
    const sort = $("discussionSortSelect").value;
    $("pageLoading")?.classList.add("d-none");

    let posts = allPosts.filter(p => getPostType(p) === "discussion");
    if (discussionCategory !== "all") {
        posts = posts.filter(p => p.category === discussionCategory);
    }
    if (search) {
        posts = posts.filter(p =>
            p.title.toLowerCase().includes(search) ||
            p.content.toLowerCase().includes(search)
        );
    }
    posts = sortPosts(posts, sort);

    if (posts.length === 0) {
        $("discussionList").innerHTML = "";
        $("discussionEmpty")?.classList.remove("d-none");
        return;
    }
    $("discussionEmpty")?.classList.add("d-none");
    $("discussionList").innerHTML = posts.map(p => renderListCard(p, "discussion")).join("");
    bindPostClicks($("discussionList"), "discussion");
}

initCategoryChips();
$("discussionSearchForm").addEventListener("submit", e => { e.preventDefault(); render(); });
$("discussionSortSelect").addEventListener("change", render);

subscribePosts(posts => {
    allPosts = posts;
    render();
}, err => {
    $("pageLoading")?.classList.add("d-none");
    showToast("Lỗi tải dữ liệu", "⚠️");
    console.error(err);
});
