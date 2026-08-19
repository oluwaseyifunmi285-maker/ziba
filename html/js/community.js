
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc,
    addDoc,
    deleteDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// ==========================================
// ELEMENTS
// ==========================================

const communityFeed =
    document.getElementById("communityFeed");

const filterButtons =
    document.querySelectorAll(".filter-btn");

const profileImage =
    document.getElementById("sellerProfileImage");

const profileIcon =
    document.getElementById("sellerProfileIcon");


// ==========================================
// VARIABLES
// ==========================================

let currentUser = null;

let allPosts = [];

let currentFilter = "all";


// ==========================================
// AUTH
// ==========================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;
    }

    currentUser = user;

    console.log(
        "Community user:",
        currentUser.uid
    );

    await loadProfile();

    await loadPosts();

});


// ==========================================
// LOAD CURRENT USER PROFILE
// ==========================================

async function loadProfile() {

    try {

        const userRef =
            doc(
                db,
                "users",
                currentUser.uid
            );

        const userSnap =
            await getDoc(userRef);

        if (!userSnap.exists()) {
            return;
        }

        const userData =
            userSnap.data();

        const photo =
            userData.profilePicture ||
            userData.photoURL ||
            "";

        if (photo && profileImage) {

            profileImage.src = photo;

            profileImage.style.display =
                "block";

            if (profileIcon) {

                profileIcon.style.display =
                    "none";

            }

        }

    } catch (error) {

        console.error(
            "Profile loading error:",
            error
        );

    }

}


// ==========================================
// LOAD POSTS
// ==========================================

async function loadPosts() {

    try {

        communityFeed.innerHTML = `

            <div class="loading">

                <i class="fas fa-spinner fa-spin"></i>

                <p>
                    Loading community posts...
                </p>

            </div>

        `;

        const postsQuery =
            query(
                collection(
                    db,
                    "posts"
                ),
                orderBy(
                    "createdAt",
                    "desc"
                )
            );

        const snapshot =
            await getDocs(
                postsQuery
            );

        console.log(
            "Community posts found:",
            snapshot.size
        );

        allPosts = [];

        for (
            const postDoc
            of snapshot.docs
        ) {

            const post =
                postDoc.data();

            post.id =
                postDoc.id;


            // ==========================================
            // LOAD POSTER
            // ==========================================

            const userId =
                post.userId ||
                post.authorId ||
                post.sellerId;

            if (userId) {

                try {

                    const userRef =
                        doc(
                            db,
                            "users",
                            userId
                        );

                    const userSnap =
                        await getDoc(
                            userRef
                        );

                    if (userSnap.exists()) {

                        post.user =
                            userSnap.data();

                    } else {

                        post.user = {};

                    }

                } catch (error) {

                    console.error(
                        "Unable to load poster:",
                        error
                    );

                    post.user = {};

                }

            } else {

                post.user = {};

            }


            // ==========================================
            // LOAD PRODUCT
            // ==========================================

            if (post.productId) {

                try {

                    const productRef =
                        doc(
                            db,
                            "products",
                            post.productId
                        );

                    const productSnap =
                        await getDoc(
                            productRef
                        );

                    if (
                        productSnap.exists()
                    ) {

                        post.product =
                            productSnap.data();

                        post.product.id =
                            post.productId;

                    }

                } catch (error) {

                    console.error(
                        "Unable to load product:",
                        error
                    );

                }

            }

            allPosts.push(post);

        }

        renderPosts();

    } catch (error) {

        console.error(
            "Load posts error:",
            error
        );

        communityFeed.innerHTML = `

            <div class="empty-state">

                <i class="fas fa-triangle-exclamation"></i>

                <h3>
                    Unable to load posts
                </h3>

                <p>
                    Please try again.
                </p>

            </div>

        `;

    }

}


// ==========================================
// RENDER POSTS
// ==========================================

function renderPosts() {

    let posts =
        [...allPosts];

    if (
        currentFilter !==
        "all"
    ) {

        posts =
            posts.filter(
                post =>
                    getPostType(post) ===
                    currentFilter
            );

    }

    if (posts.length === 0) {

        communityFeed.innerHTML = `

            <div class="empty-state">

                <i class="fas fa-users"></i>

                <h3>
                    No posts yet
                </h3>

                <p>
                    Be the first person to create a post.
                </p>

            </div>

        `;

        return;

    }

    communityFeed.innerHTML = "";

    posts.forEach(
        post => {

            communityFeed.appendChild(
                createPostElement(post)
            );

        }
    );

}


// ==========================================
// GET POST TYPE
// ==========================================

function getPostType(post) {

    return (
        post.type ||
        post.postType ||
        "general"
    ).toLowerCase();

}


// ==========================================
// CREATE POST ELEMENT
// ==========================================

function createPostElement(post) {

    const article =
        document.createElement(
            "article"
        );

    article.className =
        "community-post";

    const user =
        post.user || {};

    const userName =
        user.fullName ||
        user.name ||
        user.displayName ||
        post.authorName ||
        "Ziba User";

    const profilePicture =
        user.profilePicture ||
        user.photoURL ||
        post.authorPhoto ||
        "";

    const firstLetter =
        userName
            .charAt(0)
            .toUpperCase();

    const avatarHTML =
        profilePicture

            ? `
                <img
                    src="${escapeHTML(profilePicture)}"
                    alt="${escapeHTML(userName)}"
                >
              `

            : firstLetter;

    const type =
        getPostType(post);

    const typeLabel =
        type === "product"
            ? "Product"
            : type === "experience"
                ? "Experience"
                : "General";

    const createdTime =
        formatPostTime(
            post.createdAt
        );

    const title =
        post.title ||
        post.postTitle ||
        "";

    const content =
        post.content ||
        post.description ||
        post.text ||
        "";


    // ==========================================
    // POST IMAGE
    // ==========================================

    let imageHTML = "";

    const postImage =
        post.image ||
        post.imageUrl ||
        post.imageURL ||
        "";

    if (postImage) {

        imageHTML = `

            <img
                class="post-image"
                src="${escapeHTML(postImage)}"
                alt="Post image"
            >

        `;

    }


    // ==========================================
    // PRODUCT
    // ==========================================

    let productHTML = "";

    if (
        type === "product" &&
        post.product
    ) {

        const product =
            post.product;

        const productImage =
            product.imageUrls?.[0] ||
            product.image ||
            "";

        const productName =
            product.productName ||
            "Product";

        const price =
            Number(
                product.price || 0
            ).toLocaleString();

        const location =
            product.location ||
            "Location not provided";

        productHTML = `

            <div class="post-product">

                ${
                    productImage

                    ? `
                        <img
                            class="post-product-image"
                            src="${escapeHTML(productImage)}"
                            alt="${escapeHTML(productName)}"
                        >
                      `

                    : `
                        <div class="post-product-image">

                            <i class="fas fa-image"></i>

                        </div>
                      `
                }

                <div class="post-product-info">

                    <h3>
                        ${escapeHTML(productName)}
                    </h3>

                    <p class="price">
                        ₦${price}
                    </p>

                    <p class="location">
                        ${escapeHTML(location)}
                    </p>

                </div>

            </div>

        `;

    }


    // ==========================================
    // VIEW PRODUCT
    // ==========================================

    let productButtonHTML = "";

    if (
        type === "product" &&
        post.productId
    ) {

        productButtonHTML = `

            <a
                href="product.html?id=${encodeURIComponent(post.productId)}"
                class="view-product-btn"
            >

                View Product

            </a>

        `;

    }


    // ==========================================
    // POST HTML
    // ==========================================

    article.innerHTML = `

        <div class="post-header">

            <div class="post-user">

                <div class="post-avatar">

                    ${avatarHTML}

                </div>

                <div class="post-user-info">

                    <h3>
                        ${escapeHTML(userName)}
                    </h3>

                    <span>
                        ${createdTime}
                    </span>

                </div>

            </div>

            <span class="post-type">

                ${typeLabel}

            </span>

        </div>


        <div class="post-content">

            ${
                title
                    ? `
                        <h2>
                            ${escapeHTML(title)}
                        </h2>
                      `
                    : ""
            }

            ${
                content
                    ? `
                        <p>
                            ${escapeHTML(content)}
                        </p>
                      `
                    : ""
            }

        </div>


        ${imageHTML}

        ${productHTML}


        <div class="post-actions">

            <button
                class="post-action like-btn"
                data-post-id="${post.id}"
            >

                <i class="far fa-heart"></i>

                <span class="like-count">
                    ${Number(
                        post.likesCount || 0
                    )}
                </span>

            </button>


            <button
                class="post-action comment-btn"
                data-post-id="${post.id}"
            >

                <i class="far fa-comment"></i>

                <span class="comment-count">
                    ${Number(
                        post.commentsCount || 0
                    )}
                </span>

            </button>


            <button
                class="post-action share-btn"
                data-post-id="${post.id}"
            >

                <i class="fas fa-share"></i>

                <span>
                    Share
                </span>

            </button>

        </div>


        <!-- COMMENTS -->

        <div
            class="comments-section"
            style="display:none;"
        >

            <div class="comment-input-area">

                <div class="comment-input-avatar">

                    ${
                        currentUser
                        ? escapeHTML(
                            currentUser.displayName
                                ? currentUser.displayName
                                    .charAt(0)
                                    .toUpperCase()
                                : "U"
                        )
                        : "U"
                    }

                </div>


                <input
                    type="text"
                    class="comment-input"
                    placeholder="Write a comment..."
                >


                <button
                    class="comment-send-btn"
                    type="button"
                >

                    <i class="fas fa-paper-plane"></i>

                </button>

            </div>


            <div class="comments-list">

                <div class="comments-loading">

                    <i class="fas fa-spinner fa-spin"></i>

                    Loading comments...

                </div>

            </div>

        </div>


        ${productButtonHTML}

    `;


    // ==========================================
    // LIKE
    // ==========================================

    const likeButton =
        article.querySelector(
            ".like-btn"
        );

    const likeIcon =
        likeButton.querySelector(
            "i"
        );

    hasUserLikedPost(
        post.id
    ).then(
        liked => {

            if (liked) {

                likeIcon.className =
                    "fas fa-heart";

                likeButton.classList.add(
                    "liked"
                );

            } else {

                likeIcon.className =
                    "far fa-heart";

                likeButton.classList.remove(
                    "liked"
                );

            }

        }
    );

    likeButton.addEventListener(
        "click",
        async () => {

            await toggleLike(
                post,
                likeButton
            );

        }
    );


    // ==========================================
    // COMMENT BUTTON
    // ==========================================

    const commentButton =
        article.querySelector(
            ".comment-btn"
        );

    const commentsSection =
        article.querySelector(
            ".comments-section"
        );

    commentButton.addEventListener(
        "click",
        async () => {

            const isHidden =
                commentsSection.style.display ===
                "none";

            if (isHidden) {

                commentsSection.style.display =
                    "block";

                await loadComments(
                    post.id,
                    commentsSection
                );

            } else {

                commentsSection.style.display =
                    "none";

            }

        }
    );


    // ==========================================
    // COMMENT SEND
    // ==========================================

    const commentInput =
        article.querySelector(
            ".comment-input"
        );

    const commentSendButton =
        article.querySelector(
            ".comment-send-btn"
        );

    commentSendButton.addEventListener(
        "click",
        async () => {

            await addComment(
                post,
                commentInput,
                commentsSection
            );

        }
    );


    // ==========================================
    // ENTER TO COMMENT
    // ==========================================

    commentInput.addEventListener(
        "keydown",
        async (event) => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                await addComment(
                    post,
                    commentInput,
                    commentsSection
                );

            }

        }
    );


    // ==========================================
    // SHARE
    // ==========================================

    const shareButton =
        article.querySelector(
            ".share-btn"
        );

    shareButton.addEventListener(
        "click",
        () => {

            sharePost(
                post.id
            );

        }
    );


    return article;

}


// ==========================================
// CHECK USER LIKE
// ==========================================

async function hasUserLikedPost(
    postId
) {

    if (!currentUser) {
        return false;
    }

    try {

        const likesRef =
            collection(
                db,
                "posts",
                postId,
                "likes"
            );

        const likesSnapshot =
            await getDocs(
                likesRef
            );

        let liked = false;

        likesSnapshot.forEach(
            likeDoc => {

                const likeData =
                    likeDoc.data();

                if (
                    likeData.userId ===
                    currentUser.uid
                ) {

                    liked = true;

                }

            }
        );

        return liked;

    } catch (error) {

        console.error(
            "Check like error:",
            error
        );

        return false;

    }

}


// ==========================================
// LIKE / UNLIKE
// ==========================================

async function toggleLike(
    post,
    button
) {

    if (!currentUser) {

        alert(
            "Please login to like posts."
        );

        return;

    }

    try {

        button.disabled = true;

        const likesRef =
            collection(
                db,
                "posts",
                post.id,
                "likes"
            );

        const likesSnapshot =
            await getDocs(
                likesRef
            );

        let userLikeDoc =
            null;

        likesSnapshot.forEach(
            likeDoc => {

                const likeData =
                    likeDoc.data();

                if (
                    likeData.userId ===
                    currentUser.uid
                ) {

                    userLikeDoc =
                        likeDoc;

                }

            }
        );


        if (userLikeDoc) {

            await deleteDoc(
                doc(
                    db,
                    "posts",
                    post.id,
                    "likes",
                    userLikeDoc.id
                )
            );

            post.likesCount =
                Math.max(
                    0,
                    Number(
                        post.likesCount || 0
                    ) - 1
                );

        } else {

            await addDoc(
                likesRef,
                {

                    userId:
                        currentUser.uid,

                    createdAt:
                        serverTimestamp()

                }
            );

            post.likesCount =
                Number(
                    post.likesCount || 0
                ) + 1;

        }


        await updateDoc(
            doc(
                db,
                "posts",
                post.id
            ),
            {

                likesCount:
                    post.likesCount

            }
        );


        const icon =
            button.querySelector(
                "i"
            );

        const count =
            button.querySelector(
                ".like-count"
            );


        if (userLikeDoc) {

            icon.className =
                "far fa-heart";

            button.classList.remove(
                "liked"
            );

        } else {

            icon.className =
                "fas fa-heart";

            button.classList.add(
                "liked"
            );

        }

        count.textContent =
            post.likesCount;


    } catch (error) {

        console.error(
            "Like error:",
            error
        );

        alert(
            "Unable to update like."
        );

    } finally {

        button.disabled =
            false;

    }

}


// ==========================================
// LOAD COMMENTS
// ==========================================

async function loadComments(
    postId,
    commentsSection
) {

    const commentsList =
        commentsSection.querySelector(
            ".comments-list"
        );

    commentsList.innerHTML = `

        <div class="comments-loading">

            <i class="fas fa-spinner fa-spin"></i>

            Loading comments...

        </div>

    `;

    try {

        const commentsQuery =
            query(
                collection(
                    db,
                    "posts",
                    postId,
                    "comments"
                ),
                orderBy(
                    "createdAt",
                    "asc"
                )
            );

        const snapshot =
            await getDocs(
                commentsQuery
            );

        if (snapshot.empty) {

            commentsList.innerHTML = `

                <div class="no-comments">

                    No comments yet. Be the first to comment.

                </div>

            `;

            return;

        }

        commentsList.innerHTML = "";

        for (
            const commentDoc
            of snapshot.docs
        ) {

            const comment =
                commentDoc.data();

            comment.id =
                commentDoc.id;

            await renderComment(
                comment,
                commentsList,
                postId
            );

        }

    } catch (error) {

        console.error(
            "Load comments error:",
            error
        );

        commentsList.innerHTML = `

            <div class="no-comments">

                Unable to load comments.

            </div>

        `;

    }

}


// ==========================================
// RENDER COMMENT
// ==========================================

async function renderComment(
    comment,
    commentsList,
    postId
) {

    let userData = {};

    if (comment.userId) {

        try {

            const userSnap =
                await getDoc(
                    doc(
                        db,
                        "users",
                        comment.userId
                    )
                );

            if (userSnap.exists()) {

                userData =
                    userSnap.data();

            }

        } catch (error) {

            console.error(
                "Comment user error:",
                error
            );

        }

    }


    const userName =
        userData.fullName ||
        userData.name ||
        userData.displayName ||
        comment.userName ||
        "Ziba User";


    const profilePicture =
        userData.profilePicture ||
        userData.photoURL ||
        "";


    const firstLetter =
        userName
            .charAt(0)
            .toUpperCase();


    const avatar =
        profilePicture

        ? `
            <img
                src="${escapeHTML(profilePicture)}"
                alt="${escapeHTML(userName)}"
            >
          `

        : firstLetter;


    const canDelete =
        currentUser &&
        comment.userId ===
        currentUser.uid;


    const commentElement =
        document.createElement(
            "div"
        );

    commentElement.className =
        "comment-item";


    commentElement.innerHTML = `

        <div class="comment-avatar">

            ${avatar}

        </div>


        <div class="comment-body">

            <div class="comment-bubble">

                <div class="comment-author">

                    ${escapeHTML(userName)}

                </div>


                <div class="comment-text">

                    ${escapeHTML(
                        comment.text || ""
                    )}

                </div>

            </div>


            <div class="comment-meta">

                <span class="comment-time">

                    ${formatPostTime(
                        comment.createdAt
                    )}

                </span>


                ${
                    canDelete

                    ? `
                        <button
                            class="comment-delete"
                            type="button"
                        >

                            Delete

                        </button>
                      `

                    : ""
                }

            </div>

        </div>

    `;


    if (canDelete) {

        const deleteButton =
            commentElement.querySelector(
                ".comment-delete"
            );

        deleteButton.addEventListener(
            "click",
            async () => {

                await deleteComment(
                    postId,
                    comment.id,
                    commentElement
                );

            }
        );

    }


    commentsList.appendChild(
        commentElement
    );

}


// ==========================================
// ADD COMMENT
// ==========================================

async function addComment(
    post,
    input,
    commentsSection
) {

    if (!currentUser) {

        alert(
            "Please login to comment."
        );

        return;

    }


    const text =
        input.value.trim();


    if (!text) {

        return;

    }


    try {

        input.disabled = true;


        const sendButton =
            commentsSection.querySelector(
                ".comment-send-btn"
            );

        sendButton.disabled =
            true;


        const commentsRef =
            collection(
                db,
                "posts",
                post.id,
                "comments"
            );


        await addDoc(
            commentsRef,
            {

                userId:
                    currentUser.uid,

                text,

                createdAt:
                    serverTimestamp()

            }
        );


        post.commentsCount =
            Number(
                post.commentsCount || 0
            ) + 1;


        await updateDoc(
            doc(
                db,
                "posts",
                post.id
            ),
            {

                commentsCount:
                    post.commentsCount

            }
        );


        input.value = "";


        const commentsList =
            commentsSection.querySelector(
                ".comments-list"
            );


        await loadComments(
            post.id,
            commentsSection
        );


        const commentButton =
            commentsSection
                .parentElement
                .querySelector(
                    ".comment-btn"
                );


        const count =
            commentButton.querySelector(
                ".comment-count"
            );


        count.textContent =
            post.commentsCount;


    } catch (error) {

        console.error(
            "Add comment error:",
            error
        );

        alert(
            "Unable to post comment."
        );

    } finally {

        input.disabled =
            false;

        const sendButton =
            commentsSection.querySelector(
                ".comment-send-btn"
            );

        if (sendButton) {

            sendButton.disabled =
                false;

        }

    }

}


// ==========================================
// DELETE COMMENT
// ==========================================

async function deleteComment(
    postId,
    commentId,
    commentElement
) {

    if (!currentUser) {
        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "posts",
                postId,
                "comments",
                commentId
            )
        );


        const post =
            allPosts.find(
                item =>
                    item.id === postId
            );


        if (post) {

            post.commentsCount =
                Math.max(
                    0,
                    Number(
                        post.commentsCount || 0
                    ) - 1
                );


            await updateDoc(
                doc(
                    db,
                    "posts",
                    postId
                ),
                {

                    commentsCount:
                        post.commentsCount

                }
            );


            const commentButton =
                commentElement
                    .closest(
                        ".community-post"
                    )
                    ?.querySelector(
                        ".comment-btn"
                    );


            if (commentButton) {

                const count =
                    commentButton.querySelector(
                        ".comment-count"
                    );

                if (count) {

                    count.textContent =
                        post.commentsCount;

                }

            }

        }


        commentElement.remove();


    } catch (error) {

        console.error(
            "Delete comment error:",
            error
        );

        alert(
            "Unable to delete comment."
        );

    }

}


// ==========================================
// FILTERS
// ==========================================

filterButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                filterButtons.forEach(
                    btn => {

                        btn.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                currentFilter =
                    button.dataset.filter ||
                    "all";


                renderPosts();

            }
        );

    }
);


// ==========================================
// SHARE
// ==========================================

async function sharePost(
    postId
) {

    const shareURL =
        `${window.location.origin}${window.location.pathname}?post=${postId}`;


    try {

        if (navigator.share) {

            await navigator.share({

                title:
                    "Ziba Community",

                text:
                    "Check out this post on Ziba.",

                url:
                    shareURL

            });

            return;

        }


        await navigator.clipboard.writeText(
            shareURL
        );


        alert(
            "Post link copied!"
        );


    } catch (error) {

        console.log(
            "Share cancelled:",
            error
        );

    }

}


// ==========================================
// FORMAT TIME
// ==========================================

function formatPostTime(
    timestamp
) {

    if (!timestamp) {

        return "Just now";

    }


    try {

        const date =
            timestamp.toDate
                ? timestamp.toDate()
                : new Date(timestamp);


        return date.toLocaleString(
            [],
            {

                day:
                    "numeric",

                month:
                    "short",

                year:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit"

            }
        );

    } catch (error) {

        return "Just now";

    }

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}

