import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// ==========================================
// ELEMENTS
// ==========================================

const communityFeed =
    document.getElementById("adminCommunityFeed");

const totalPosts =
    document.getElementById("totalPosts");

const productPosts =
    document.getElementById("productPosts");

const experiencePosts =
    document.getElementById("experiencePosts");

const generalPosts =
    document.getElementById("generalPosts");

const filterButtons =
    document.querySelectorAll(".filter-btn");

const logoutBtn =
    document.getElementById("logoutBtn");


// ==========================================
// VARIABLES
// ==========================================

let currentUser = null;

let allPosts = [];

let currentFilter = "all";


// ==========================================
// ADMIN AUTH
// ==========================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href =
            "login.html";

        return;
    }

    currentUser = user;

    try {

        // ==========================================
        // CHECK ADMIN ACCOUNT
        // ==========================================

        const userRef =
            doc(
                db,
                "users",
                user.uid
            );

        const userSnap =
            await getDoc(userRef);


        if (!userSnap.exists()) {

            alert(
                "Admin profile not found."
            );

            window.location.href =
                "login.html";

            return;
        }


        const userData =
            userSnap.data();


        // ==========================================
        // ADMIN ACCESS CHECK
        // ==========================================

        const isAdmin =
            userData.accountType === "admin" ||
            userData.role === "admin" ||
            userData.isAdmin === true;


        if (!isAdmin) {

            alert(
                "Access denied. Admins only."
            );

            window.location.href =
                "index.html";

            return;
        }


        // ==========================================
        // LOAD COMMUNITY
        // ==========================================

        await loadPosts();

    } catch (error) {

        console.error(
            "Admin authentication error:",
            error
        );

        alert(
            "Unable to verify admin account."
        );

    }

});


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
            "Admin posts found:",
            snapshot.size
        );


        allPosts = [];


        // ==========================================
        // LOAD EACH POST
        // ==========================================

        for (
            const postDoc
            of snapshot.docs
        ) {

            const post =
                postDoc.data();


            post.id =
                postDoc.id;


            // ==========================================
            // LOAD POST AUTHOR
            // ==========================================

            const userId =
                post.userId ||
                post.authorId ||
                post.sellerId;


            post.user = {};


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

                    }

                } catch (error) {

                    console.error(
                        "Unable to load post author:",
                        error
                    );

                }

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


                    if (productSnap.exists()) {

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


            allPosts.push(
                post
            );

        }


        updateStatistics();

        renderPosts();


    } catch (error) {

        console.error(
            "Load admin posts error:",
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
// STATISTICS
// ==========================================

function updateStatistics() {

    let products = 0;

    let experiences = 0;

    let general = 0;


    allPosts.forEach(
        post => {

            const type =
                getPostType(post);


            if (type === "product") {

                products++;

            } else if (
                type === "experience"
            ) {

                experiences++;

            } else {

                general++;

            }

        }
    );


    totalPosts.textContent =
        allPosts.length;

    productPosts.textContent =
        products;

    experiencePosts.textContent =
        experiences;

    generalPosts.textContent =
        general;

}


// ==========================================
// GET POST TYPE
// ==========================================

function getPostType(post) {

    return (
        post.type ||
        post.postType ||
        "general"
    )
        .toString()
        .toLowerCase();

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
                    No posts found
                </h3>

                <p>
                    There are no posts in this category.
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
// CREATE ADMIN POST CARD
// ==========================================

function createPostElement(post) {

    const article =
        document.createElement(
            "article"
        );


    article.className =
        "admin-post";


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


    const title =
        post.title ||
        post.postTitle ||
        "";


    const content =
        post.content ||
        post.description ||
        post.text ||
        "";


    const createdTime =
        formatPostTime(
            post.createdAt
        );


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
                class="admin-post-image"
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

            <div class="admin-product">

                ${
                    productImage

                    ? `

                        <img
                            class="admin-product-image"
                            src="${escapeHTML(productImage)}"
                            alt="${escapeHTML(productName)}"
                        >

                      `

                    : `

                        <div class="admin-product-image">

                            <i class="fas fa-image"></i>

                        </div>

                      `
                }


                <div class="admin-product-info">

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
    // POST HTML
    // ==========================================

    article.innerHTML = `

        <div class="admin-post-header">

            <div class="admin-post-user">

                <div class="admin-post-avatar">

                    ${avatarHTML}

                </div>


                <div class="admin-post-user-info">

                    <h3>
                        ${escapeHTML(userName)}
                    </h3>

                    <span>
                        ${createdTime}
                    </span>

                </div>

            </div>


            <span class="admin-post-type">

                ${typeLabel}

            </span>

        </div>


        <div class="admin-post-content">

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


        <div class="admin-post-footer">

            <div class="post-stats">

                <span>

                    <i class="fas fa-heart"></i>

                    ${Number(
                        post.likesCount || 0
                    )}

                </span>


                <span>

                    <i class="fas fa-comment"></i>

                    ${Number(
                        post.commentsCount || 0
                    )}

                </span>

            </div>


            <button
                class="delete-post-btn"
                data-post-id="${post.id}"
            >

                <i class="fas fa-trash"></i>

                Delete Post

            </button>

        </div>

    `;


    // ==========================================
    // DELETE
    // ==========================================

    const deleteButton =
        article.querySelector(
            ".delete-post-btn"
        );


    deleteButton.addEventListener(
        "click",
        async () => {

            await deletePost(
                post,
                article
            );

        }
    );


    return article;

}


// ==========================================
// DELETE POST
// ==========================================

async function deletePost(
    post,
    article
) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this post? This action cannot be undone."
        );


    if (!confirmed) {
        return;
    }


    try {

        const postRef =
            doc(
                db,
                "posts",
                post.id
            );


        await deleteDoc(
            postRef
        );


        // ==========================================
        // REMOVE FROM LOCAL ARRAY
        // ==========================================

        allPosts =
            allPosts.filter(
                item =>
                    item.id !==
                    post.id
            );


        updateStatistics();


        // ==========================================
        // REMOVE FROM PAGE
        // ==========================================

        article.remove();


        // ==========================================
        // EMPTY STATE
        // ==========================================

        if (
            allPosts.filter(
                item =>
                    currentFilter === "all" ||
                    getPostType(item) ===
                    currentFilter
            ).length === 0
        ) {

            renderPosts();

        }


        alert(
            "Post deleted successfully."
        );


    } catch (error) {

        console.error(
            "Delete post error:",
            error
        );


        alert(
            "Unable to delete post."
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
// LOGOUT
// ==========================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async (event) => {

            event.preventDefault();


            try {

                await signOut(
                    auth
                );


                window.location.href =
                    "login.html";


            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );


                alert(
                    error.message
                );

            }

        }
    );

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
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
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