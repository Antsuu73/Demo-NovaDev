import { initCommon } from "./init.js";
import { setActiveNav, subscribePosts, showToast, bindPostClicks, getPostType, sortPosts, renderListCard } from "./common.js";
import { $ } from "./utils.js";

initCommon();
setActiveNav("qa");

let allPosts = [];

function render() {
    const search = $("qaSearchInput").value.trim().toLowerCase();
    const sort = $("qaSortSelect").value;
    $("pageLoading")?.classList.add("d-none");

    let posts = allPosts.filter(p => getPostType(p) === "qa");
    if (search) {
        posts = posts.filter(p =>
            (p.title || "").toLowerCase().includes(search) ||
            (p.content || "").toLowerCase().includes(search)
        );
    }
    posts = sortPosts(posts, sort);

    if (posts.length === 0) {
        $("qaList").innerHTML = "";
        $("qaEmpty")?.classList.remove("d-none");
        return;
    }
    $("qaEmpty")?.classList.add("d-none");
    $("qaList").innerHTML = posts.map(p => renderListCard(p, "qa")).join("");
    bindPostClicks($("qaList"), "qa");
}

$("qaSearchForm").addEventListener("submit", e => { e.preventDefault(); render(); });
$("qaSortSelect").addEventListener("change", render);

subscribePosts(posts => {
    allPosts = posts;
    render();
}, err => {
    $("pageLoading")?.classList.add("d-none");
    showToast("Lỗi tải dữ liệu", "⚠️");
    console.error(err);
});
