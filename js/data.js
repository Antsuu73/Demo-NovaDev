export const CATEGORIES = [
    { id: "general", name: "Chung", icon: "" },
    { id: "tech", name: "Công nghệ", icon: "" },
    { id: "education", name: "Giáo dục", icon: "" },
    { id: "entertainment", name: "Giải trí", icon: "" },
    { id: "life", name: "Đời sống", icon: "" }
];

export const POST_TYPES = {
    qa: { id: "qa", name: "Hỏi đáp", icon: "", color: "#3182ce" },
    discussion: { id: "discussion", name: "Thảo luận", icon: "", color: "#c05621" }
};

export const SAMPLE_POSTS = [
    {
        title: "Chào mừng đến với NovaDev!",
        content: "Đây là bài viết đầu tiên trên diễn đàn. Hãy chia sẻ ý kiến, đặt câu hỏi và kết nối với cộng đồng nhé!",
        category: "general",
        type: "discussion",
        authorName: "Admin",
        authorId: "system",
        views: 0,
        likes: 0,
        commentCount: 0,
    }
];

export const SAMPLE_COMMENTS = [];

export function getCategoryName(id) {
    const cat = CATEGORIES.find(c => c.id === id);
    return cat ? cat.name : id;
}

export function getCategoryIcon(id) {
    return "";
}

export function getTypeName(id) {
    const t = POST_TYPES[id];
    return t ? t.name : "Bài viết";
}

export function getTypeIcon(id) {
    return "";
}

export function timeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const intervals = [
        { label: "năm", secs: 31536000 },
        { label: "tháng", secs: 2592000 },
        { label: "ngày", secs: 86400 },
        { label: "giờ", secs: 3600 },
        { label: "phút", secs: 60 }
    ];
    for (const { label, secs } of intervals) {
        const count = Math.floor(seconds / secs);
        if (count >= 1) return `${count} ${label} trước`;
    }
    return "Vừa xong";
}
