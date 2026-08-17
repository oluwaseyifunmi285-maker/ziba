import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const productContainer = document.getElementById("productContainer");

async function loadProducts() {

    productContainer.innerHTML = "<h3>Loading products...</h3>";

    try {

        const querySnapshot = await getDocs(collection(db, "products"));
    console.log("Products found:", querySnapshot.size);

        productContainer.innerHTML = "";

        if (querySnapshot.empty) {

            productContainer.innerHTML = "<h3>No products available.</h3>";
            return;

        }

        querySnapshot.forEach((doc) => {

            const product = doc.data();

            productContainer.innerHTML += `

            <div class="product-card">

                <img src="${product.imageUrls [0] || 'https://via.placeholder.com/300x220?text=No+Image'}">

                <div class="product-info">

                  <h3>${product.productName}</h3>
                  

                    <p class="price">₦${product.price}</p>

                    <p class="location">${product.location}</p>
<p class="location">${product.location || "Location not provided"}</p>
                    <button class="viewBtn"
                    onclick="window.location.href='product.html?id=${doc.id}'">

                    View Product

                    </button>

                </div>

            </div>

            `;

        });

    }

    catch(error){

        console.log(error);

        productContainer.innerHTML = "<h3>Failed to load products.</h3>";

    }

}

loadProducts();
