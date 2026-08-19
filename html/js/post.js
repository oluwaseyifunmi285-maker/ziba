
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


const form =
    document.getElementById("productForm");


onAuthStateChanged(auth, (user) => {

    if (!user) {

        window.location.href =
            "login.html";

        return;

    }


    form.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const productName =
                document
                    .getElementById("name")
                    .value
                    .trim();


            const description =
                document
                    .getElementById("description")
                    .value
                    .trim();


            const category =
                document
                    .getElementById("category")
                    .value;


            const price =
                Number(
                    document
                        .getElementById("price")
                        .value
                );


            const stock =
                Number(
                    document
                        .getElementById("stock")
                        .value
                );


            const location =
                document
                    .getElementById("location")
                    .value
                    .trim();


            try {

                // ==========================================
                // UPLOAD IMAGES TO CLOUDINARY
                // ==========================================

                const files =
                    document
                        .getElementById("images")
                        .files;


                let imageUrls = [];


                for (let file of files) {

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


                    imageUrls.push(
                        data.secure_url
                    );

                }


                console.log(
                    "Uploaded images:",
                    imageUrls
                );


                // ==========================================
                // CREATE PRODUCT
                // ==========================================

                const productRef =
                    await addDoc(
                        collection(
                            db,
                            "products"
                        ),
                        {

                            sellerId:
                                user.uid,

                            productName:
                                productName,

                            description:
                                description,

                            category:
                                category,

                            price:
                                price,

                            stock:
                                stock,

                            location:
                                location,

                            imageUrls:
                                imageUrls,

                            createdAt:
                                serverTimestamp()

                        }
                    );


                console.log(
                    "Product created:",
                    productRef.id
                );


                // ==========================================
                // CREATE COMMUNITY PRODUCT POST
                // ==========================================

                await addDoc(
                    collection(
                        db,
                        "posts"
                    ),
                    {

                        // Post type
                        type:
                            "product",

                        // Link to the actual product
                        productId:
                            productRef.id,

                        // Seller who created the post
                        sellerId:
                            user.uid,

                        // Also store userId so
                        // community.js can find the user
                        userId:
                            user.uid,

                        // Product information
                        title:
                            productName,

                        content:
                            description,

                        // Use first product image
                        image:
                            imageUrls.length > 0
                                ? imageUrls[0]
                                : "",

                        // Initial engagement counts
                        likesCount:
                            0,

                        commentsCount:
                            0,

                        sharesCount:
                            0,

                        // Post date
                        createdAt:
                            serverTimestamp()

                    }
                );


                console.log(
                    "Community product post created"
                );


                // ==========================================
                // SUCCESS
                // ==========================================

                alert(
                    "Product added successfully!"
                );


                form.reset();


                window.location.href =
                    "seller-dashboard.html";


            } catch (error) {

                console.error(
                    "Product posting error:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to publish product."
                );

            }

        }
    );

});

