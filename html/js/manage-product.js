
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const productContainer = document.getElementById("productContainer");

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    loadProducts(user.uid);

});

async function loadProducts(uid){

    productContainer.innerHTML = "<h2>Loading...</h2>";

    try{

        const q = query(
            collection(db,"products"),
            where("sellerId","==",uid)
        );

        const snapshot = await getDocs(q);

        productContainer.innerHTML = "";

        if(snapshot.empty){

            productContainer.innerHTML = `
                <h2>No products yet.</h2>
            `;

            return;

        }

        snapshot.forEach((item)=>{

            const product = item.data();

            productContainer.innerHTML += `

            <div class="product-card">

                <img src="${
                    product.imageUrls && product.imageUrls.length
                    ? product.imageUrls[0]
                    : "https://via.placeholder.com/400x250?text=No+Image"
                }">

                <div class="product-info">

                    <h2>${product.productName}</h2>

                    <p class="price">
                        ₦${product.price}
                    </p>

                    <p class="category">
                        ${product.category}
                    </p>

                    <div class="actions">

                        <button
                        class="edit-btn"
                        onclick="editProduct('${item.id}')">

                        Edit

                        </button>

                        <button
                        class="delete-btn"
                        onclick="deleteProduct('${item.id}')">

                        Delete

                        </button>

                    </div>

                </div>

            </div>

            `;

        });

    }catch(error){

        console.log(error);

        productContainer.innerHTML =
        "<h2>Failed to load products.</h2>";

    }

}

window.editProduct = function(id){

    window.location.href =
    `edit-product.html?id=${id}`;

}

window.deleteProduct = async function(id){

    const confirmDelete =
    confirm("Delete this product?");

    if(!confirmDelete) return;

    try{

        await deleteDoc(doc(db,"products",id));

        alert("Product deleted.");

        location.reload();

    }catch(error){

        alert(error.message);

    }

}