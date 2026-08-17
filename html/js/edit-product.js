
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const form = document.getElementById("editProductForm");

const productName = document.getElementById("productName");
const price = document.getElementById("price");
const category = document.getElementById("category");
const locationInput = document.getElementById("location");
const description = document.getElementById("description");
const stock = document.getElementById("stock");
const previewImage = document.getElementById("previewImage");

let currentUser = null;

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;

    loadProduct();

});

async function loadProduct() {

    try {

        const ref = doc(db, "products", productId);

        const snap = await getDoc(ref);

        if (!snap.exists()) {

            alert("Product not found.");

            window.location.href = "manage-products.html";

            return;

        }

        const product = snap.data();

        if (product.sellerId !== currentUser.uid) {

            alert("You are not allowed to edit this product.");

            window.location.href = "manage-products.html";

            return;

        }

        productName.value = product.productName || "";
        price.value = product.price || "";
        category.value = product.category || "";
        locationInput.value = product.location || "";
        description.value = product.description || "";
        stock.value = product.stock || "";

        if (product.imageUrls && product.imageUrls.length > 0) {
            previewImage.src = product.imageUrls[0];
        }

    } catch (error) {

        console.error(error);
        alert("Error loading product.");

    }

}

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    try {

        await updateDoc(doc(db, "products", productId), {

            productName: productName.value.trim(),
            price: Number(price.value),
            category: category.value,
            location: locationInput.value.trim(),
            description: description.value.trim(),
            stock: Number(stock.value)

        });

        alert("✅ Product updated successfully!");

        window.location.href = "manage-products.html";

    } catch (error) {

        console.error(error);

        alert("Failed to update product.");

    }

});
