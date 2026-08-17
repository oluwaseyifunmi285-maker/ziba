import { auth, db } from "./firebase-config.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const productImage = document.getElementById("productImage");
const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");
const productDescription = document.getElementById("productDescription");
const productLocation = document.getElementById("productLocation");
const sellerName = document.getElementById("sellerName");

const chatBtn = document.getElementById("chatBtn");
const saveBtn = document.getElementById("saveBtn");
const buyBtn = document.getElementById("buyBtn");

let product = null;


// ===============================
// LOAD PRODUCT
// ===============================

async function loadProduct() {

    if (!productId) {
        alert("Product not found.");
        window.location.href = "buyer-dashboard.html";
        return;
    }

    try {

        console.log("Product ID:", productId);

        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {

            product = docSnap.data();

            // Product name
            productName.textContent =
                product.productName || "No Name";

            // Product price
            productPrice.textContent =
                "₦" + Number(product.price || 0).toLocaleString();

            // Description
            productDescription.textContent =
                product.description || "No description available.";

            // Location
            productLocation.textContent =
                product.location || "Location not available";

            // Seller
            sellerName.textContent =
                product.sellerName || "Ziba Seller";


            // Product image
            if (
                product.imageUrls &&
                product.imageUrls.length > 0
            ) {

                productImage.src =
                    product.imageUrls[0];

            } else {

                productImage.src =
                    "https://via.placeholder.com/600x450?text=No+Image";

            }

        } else {

            alert("Product does not exist.");

            window.location.href =
                "buyer-dashboard.html";

        }

    } catch (error) {

        console.error("Load product error:", error);

        alert("Unable to load product.");

    }
}


// ===============================
// BUY NOW
// ===============================

if (buyBtn) {

    buyBtn.addEventListener("click", () => {

        if (!productId) {
            alert("Product not found.");
            return;
        }

        window.location.href =
            `checkout.html?id=${productId}`;

    });

}


// ===============================
// CHAT SELLER
// ===============================

if (chatBtn) {

    chatBtn.addEventListener("click", async () => {

        if (!auth.currentUser) {

            alert("Please login first.");
            return;

        }

        if (!product) {

            alert("Product is still loading. Please try again.");
            return;

        }

        if (!product.sellerId) {

            alert("Seller information is unavailable.");
            return;

        }


        const buyerId =
            auth.currentUser.uid;

        const sellerId =
            product.sellerId;


        const chatId =
            [buyerId, sellerId]
                .sort()
                .join("_");


        try {

            const chatRef =
                doc(db, "chats", chatId);

            const chatSnap =
                await getDoc(chatRef);


            if (!chatSnap.exists()) {

                await setDoc(chatRef, {

                    participants: [
                        buyerId,
                        sellerId
                    ],

                    createdAt:
                        serverTimestamp(),

                    lastMessage: ""

                });

            }


            window.location.href =
                `conversation.html?chatId=${chatId}`;


        } catch (error) {

            console.error(
                "Chat error:",
                error
            );

            alert(
                "Unable to start chat."
            );

        }

    });

}


// ===============================
// SAVE ITEM
// ===============================

if (saveBtn) {

    saveBtn.addEventListener("click", () => {

        alert("Added to favourites!");

    });

}


// ===============================
// START
// ===============================

loadProduct();