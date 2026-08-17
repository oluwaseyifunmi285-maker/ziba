
import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");

let products = [];

async function loadProducts() {

    try {

        const snapshot = await getDocs(collection(db, "products"));

        products = [];

        snapshot.forEach((doc) => {

            products.push({
                id: doc.id,
                ...doc.data()
            });

        });

        displayProducts(products);

    } catch (error) {

        console.error(error);

        productGrid.innerHTML =
        "<h2>Unable to load products.</h2>";

    }

}

function displayProducts(data) {

    productGrid.innerHTML = "";

    if (data.length === 0) {

        productGrid.innerHTML =
        "<h2>No products found.</h2>";

        return;

    }

    data.forEach(product => {


       productGrid.innerHTML += `
    <div class="product-card">

        <img
            src="${
                product.imageUrls && product.imageUrls.length > 0
                    ? product.imageUrls[0]
                    : 'https://via.placeholder.com/300x220?text=No+Image'
            }"
            alt="${product.productName || 'Product'}"
        >

        <div class="product-info">

            <h3>
                ${product.productName || "Unnamed Product"}
            </h3>

            <p class="price">
                ₦${Number(product.price || 0).toLocaleString()}
            </p>

            <p class="location">
                ${product.location || "Nigeria"}
            </p>

            <button
                class="view-btn"
                onclick="window.location.href='product.html?id=${product.id}'">
                View Product
            </button>

        </div>

    </div>            


        `;

    });

}

// Search
searchInput.addEventListener("input", () => {

    const keyword = searchInput.value.toLowerCase();

    const filtered = products.filter(product =>

        product.productName.toLowerCase().includes(keyword) ||

        product.category.toLowerCase().includes(keyword)

    );

    displayProducts(filtered);

});

loadProducts();