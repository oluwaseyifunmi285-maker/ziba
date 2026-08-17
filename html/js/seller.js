
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const sellerName = document.getElementById("sellerName");
const sellerPlan = document.getElementById("sellerPlan");
const logoutBtn = document.getElementById("logoutBtn");
const totalProducts = document.getElementById("totalProducts");

onAuthStateChanged(auth, async (user) => {
    const productsQuery = query(
    collection(db, "products"),
    where("sellerId", "==", user.uid)
);

const productsSnapshot = await getDocs(productsQuery);

totalProducts.textContent = productsSnapshot.size;
const productsContainer =
    document.getElementById("productsContainer");

productsContainer.innerHTML = "";

if (productsSnapshot.empty) {

    productsContainer.innerHTML =
        "<p>You haven't posted any products yet.</p>";

} else {

    productsSnapshot.forEach((productDoc) => {

        const product = productDoc.data();

        const productCard =
            document.createElement("div");

        productCard.className = "product-card";

        productCard.innerHTML = `
            <img
                src="${product.imageUrls?.[0] || ""}"
                alt="${product.productName || "Product"}"
            >

            <div class="product-info">
                <h3>
                    ${product.productName || "Unnamed Product"}
                </h3>

                <p>
                    ₦${Number(product.price || 0).toLocaleString()}
                </p>

                <p>
                    ${product.location || "Location not provided"}
                </p>
            </div>
        `;

        productsContainer.appendChild(productCard);

    });
}

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {

        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {

            const data = docSnap.data();
            
const productsQuery = query(
    collection(db, "products"),
    where("sellerId", "==", user.uid)
);

const productsSnapshot = await getDocs(productsQuery);

totalProducts.textContent = productsSnapshot.size;


            sellerName.textContent = "Welcome, " + data.fullName;
            sellerPlan.textContent = data.plan || "Free";

            // Prevent buyers from accessing seller dashboard
            if (data.accountType !== "seller") {
                alert("Access denied!");
                window.location.href = "index.html";
            }

        } else {

            alert("User profile not found.");
            window.location.href = "login.html";

        }

    } catch (error) {

        console.error(error);
        alert("Something went wrong.");

    }

});

// Logout
logoutBtn.addEventListener("click", async () => {

    try {

        await signOut(auth);

        window.location.href = "login.html";

    } catch (error) {

        alert(error.message);

    }

});