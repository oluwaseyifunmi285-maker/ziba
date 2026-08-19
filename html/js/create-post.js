
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


/* ==========================================
   ELEMENTS
========================================== */

const form =
    document.getElementById("createPostForm");

const postTypes =
    document.querySelectorAll(".post-type");

const postType =
    document.getElementById("postType");

const title =
    document.getElementById("title");

const content =
    document.getElementById("content");

const characterCount =
    document.getElementById("characterCount");

const productSection =
    document.getElementById("productSection");

const productSelect =
    document.getElementById("productSelect");

const postImage =
    document.getElementById("postImage");

const imagePreview =
    document.getElementById("imagePreview");

const publishBtn =
    document.getElementById("publishBtn");


let currentUser = null;


/* ==========================================
   AUTH
========================================== */

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href =
            "login.html";

        return;
    }

    currentUser = user;

    await loadProducts();

});


/* ==========================================
   POST TYPE
========================================== */

postTypes.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            postTypes.forEach(btn => {

                btn.classList.remove(
                    "active"
                );

            });


            button.classList.add(
                "active"
            );


            const selectedType =
                button.dataset.type;


            postType.value =
                selectedType;


            if (
                selectedType ===
                "product"
            ) {

                productSection.classList.remove(
                    "hidden"
                );

            } else {

                productSection.classList.add(
                    "hidden"
                );

                productSelect.value =
                    "";

            }

        }
    );

});


/* ==========================================
   CHARACTER COUNT
========================================== */

content.addEventListener(
    "input",
    () => {

        characterCount.textContent =
            content.value.length;

    }
);


/* ==========================================
   LOAD SELLER PRODUCTS
========================================== */

async function loadProducts() {

    try {

        const productsQuery =
            query(
                collection(
                    db,
                    "products"
                ),
                where(
                    "sellerId",
                    "==",
                    currentUser.uid
                )
            );


        const snapshot =
            await getDocs(
                productsQuery
            );


        productSelect.innerHTML = `

            <option value="">
                Choose one of your products
            </option>

        `;


        snapshot.forEach(
            productDoc => {

                const product =
                    productDoc.data();


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    productDoc.id;


                option.textContent =
                    product.productName ||
                    "Unnamed Product";


                productSelect.appendChild(
                    option
                );

            }
        );


    } catch (error) {

        console.error(
            "Products loading error:",
            error
        );

    }

}


/* ==========================================
   IMAGE PREVIEW
========================================== */

postImage.addEventListener(
    "change",
    () => {

        imagePreview.innerHTML = "";


        const file =
            postImage.files[0];


        if (!file) {
            return;
        }


        const reader =
            new FileReader();


        reader.onload =
            (event) => {

                imagePreview.innerHTML = `

                    <img
                        src="${event.target.result}"
                        alt="Preview"
                    >

                `;

            };


        reader.readAsDataURL(
            file
        );

    }
);


/* ==========================================
   CREATE POST
========================================== */

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (!currentUser) {

            alert(
                "Please login first."
            );

            return;

        }


        const selectedType =
            postType.value;


        const postTitle =
            title.value.trim();


        const postContent =
            content.value.trim();


        const selectedProduct =
            productSelect.value;


        if (!postContent) {

            alert(
                "Please write something for your post."
            );

            return;

        }


        if (
            selectedType ===
            "product" &&
            !selectedProduct
        ) {

            alert(
                "Please select a product."
            );

            return;

        }


        try {

            publishBtn.disabled =
                true;


            publishBtn.innerHTML = `

                <i class="fas fa-spinner fa-spin"></i>

                Publishing...

            `;


            /* ==========================================
               USER PROFILE
            ========================================== */

            let authorName =
                "Ziba User";

            let authorPhoto =
                "";


            const userQuery =
                query(
                    collection(
                        db,
                        "users"
                    ),
                    where(
                        "__name__",
                        "==",
                        currentUser.uid
                    )
                );


            const userSnapshot =
                await getDocs(
                    userQuery
                );


            if (
                !userSnapshot.empty
            ) {

                const userData =
                    userSnapshot
                        .docs[0]
                        .data();


                authorName =
                    userData.fullName ||
                    userData.name ||
                    currentUser.displayName ||
                    "Ziba User";


                authorPhoto =
                    userData.profilePicture ||
                    userData.photoURL ||
                    currentUser.photoURL ||
                    "";

            } else {

                authorName =
                    currentUser.displayName ||
                    "Ziba User";

                authorPhoto =
                    currentUser.photoURL ||
                    "";

            }


            /* ==========================================
               IMAGE UPLOAD
            ========================================== */

            let imageUrl = "";


            const file =
                postImage.files[0];


            if (file) {

                const formData =
                    new FormData();


                formData.append(
                    "file",
                    file
                );


                formData.append(
                    "upload_preset",
                    "Ziba_upload"
                );


                const response =
                    await fetch(
                        "https://api.cloudinary.com/v1_1/eym2eljf/image/upload",
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error?.message ||
                        "Image upload failed."
                    );

                }


                imageUrl =
                    data.secure_url;

            }


            /* ==========================================
               POST DATA
            ========================================== */

            const postData = {

                userId:
                    currentUser.uid,

                authorName,

                authorPhoto,

                type:
                    selectedType,

                title:
                    postTitle,

                content:
                    postContent,

                image:
                    imageUrl,

                likesCount:
                    0,

                commentsCount:
                    0,

                createdAt:
                    serverTimestamp()

            };


            /* ==========================================
               PRODUCT POST
            ========================================== */

            if (
                selectedType ===
                "product"
            ) {

                postData.productId =
                    selectedProduct;

            }


            /* ==========================================
               SAVE POST
            ========================================== */

            await addDoc(
                collection(
                    db,
                    "posts"
                ),
                postData
            );


            alert(
                "Post published successfully!"
            );


            window.location.href =
                "community.html";


        } catch (error) {

            console.error(
                "Create post error:",
                error
            );


            alert(
                error.message ||
                "Unable to publish post."
            );


            publishBtn.disabled =
                false;


            publishBtn.innerHTML = `

                <i class="fas fa-paper-plane"></i>

                Publish Post

            `;

        }

    }
);

