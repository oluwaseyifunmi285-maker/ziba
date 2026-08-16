import { auth, db } from "./firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const productImage = document.getElementById("productImage");
const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");
const payBtn = document.getElementById("payBtn");
let product = null;


// ===============================
// LOAD PRODUCT
// ===============================

async function loadProduct() {

    if (!productId) {
        productName.textContent = "Product not found.";
        return;
    }

    try {

        const productRef =
            doc(db, "products", productId);

        const productSnap =
            await getDoc(productRef);

        if (!productSnap.exists()) {

            checkoutProduct.innerHTML =
                "<p>Product not found.</p>";

            return;
        }

        product = productSnap.data();
productImage.src =
    product.imageUrls?.[0] ||
    "https://via.placeholder.com/300x220?text=No+Image";

productName.textContent =
    product.productName || "Unnamed Product";

productPrice.textContent =
    `₦${Number(product.price || 0).toLocaleString()}`;
        

    } catch (error) {

        console.error("Checkout product error:", error);

        checkoutProduct.innerHTML =
            "<p>Unable to load product.</p>";
    }
}


// ===============================
// PAY NOW
// ===============================

payBtn.addEventListener("click", async () => {

    const buyerName =
        document.getElementById("buyerName").value.trim();

    const buyerEmail =
        document.getElementById("buyerEmail").value.trim();
        const buyerId = auth.currentUser?.uid;
const sellerId = product.sellerId;


    if (!buyerName || !buyerEmail) {

        alert("Please enter your name and email.");
        return;

    }


    if (!product) {

        alert("Product is still loading. Please try again.");
        return;

    }


    const amount =
        Number(product.price);


    if (!amount || amount <= 0) {

        alert("Invalid product price.");
        return;

    }


    try {

        payBtn.disabled = true;
        payBtn.textContent = "Processing...";


        const response = await fetch(
            "http://localhost:3000/api/payment/initialize",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

          body: JSON.stringify({
    email: buyerEmail,
    amount: amount,
    productId: productId,
    productName: product.productName,
    buyerName: buyerName,
    buyerId: buyerId,
    sellerId: sellerId
})
            }
        );


        const data =
            await response.json();


        console.log("Payment response:", data);


        if (data.status) {

            window.location.href =
                data.data.authorization_url;

        } else {

            alert(
                data.message ||
                "Unable to initialize payment."
            );

            payBtn.disabled = false;
            payBtn.textContent = "Pay Now";

        }


    } catch (error) {

        console.error(
            "Payment error:",
            error
        );

        alert(
            "Server not responding. Make sure your Ziba backend is running."
        );

        payBtn.disabled = false;
        payBtn.textContent = "Pay Now";

    }

});


// loadProduct();
loadProduct().then(() => {
    console.log("Checkout product loaded:", product);
});