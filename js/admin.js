// ===============================
// ZIBA ADMIN DASHBOARD
// ===============================

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { app } from "./firebase.js";


// ===============================
// FIREBASE
// ===============================

const auth = getAuth(app);
const db = getFirestore(app);


// ===============================
// ELEMENTS
// ===============================

const totalUsers = document.getElementById("totalUsers");
const totalProducts = document.getElementById("totalProducts");
const activeSellers = document.getElementById("activeSellers");
const totalChats = document.getElementById("totalChats");

const productTable = document.getElementById("productTable");
const logoutBtn = document.getElementById("logoutBtn");


// ===============================
// CHECK ADMIN LOGIN
// ===============================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "login.html";
        return;

    }

    // IMPORTANT:
    // For now we check the user's role
    // from the Firestore users collection.

    try {

        const usersSnapshot = await getDocs(
            collection(db, "users")
        );

        let currentUser = null;

        usersSnapshot.forEach((userDoc) => {

            const data = userDoc.data();

            if (userDoc.id === user.uid) {
                currentUser = data;
            }

        });

        if (!currentUser || currentUser.role !== "admin") {

            alert("Access denied. Admins only.");

            window.location.href = "buyer.html";

            return;

        }

        // Load dashboard
        loadDashboard();

    } catch (error) {

        console.error("Admin verification error:", error);

    }

});


// ===============================
// LOAD DASHBOARD
// ===============================

async function loadDashboard() {

    await loadUsers();

    await loadProducts();

    await loadChats();

    await loadLatestProducts();

}


// ===============================
// LOAD USERS
// ===============================

async function loadUsers() {

    try {

        const snapshot = await getDocs(
            collection(db, "users")
        );

        let users = 0;
        let sellers = 0;

        snapshot.forEach((doc) => {

            const data = doc.data();

            users++;

            if (
                data.role === "seller" ||
                data.accountType === "seller"
            ) {

                sellers++;

            }

        });

        totalUsers.textContent = users;

        activeSellers.textContent = sellers;

    } catch (error) {

        console.error("Error loading users:", error);

    }

}


// ===============================
// LOAD PRODUCTS COUNT
// ===============================

async function loadProducts() {

    try {

        const snapshot = await getDocs(
            collection(db, "products")
        );

        totalProducts.textContent = snapshot.size;

    } catch (error) {

        console.error("Error loading products:", error);

        totalProducts.textContent = "0";

    }

}


// ===============================
// LOAD CHATS COUNT
// ===============================

async function loadChats() {

    try {

        const snapshot = await getDocs(
            collection(db, "chats")
        );

        totalChats.textContent = snapshot.size;

    } catch (error) {

        console.error("Error loading chats:", error);

        totalChats.textContent = "0";

    }

}


// ===============================
// LOAD LATEST PRODUCTS
// ===============================

async function loadLatestProducts() {

    try {

        productTable.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;">
                    Loading products...
                </td>
            </tr>
        `;

        const productsQuery = query(
            collection(db, "products"),
            orderBy("createdAt", "desc"),
            limit(20)
        );

        const snapshot = await getDocs(productsQuery);

        productTable.innerHTML = "";

        if (snapshot.empty) {

            productTable.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">
                        No products found.
                    </td>
                </tr>
            `;

            return;

        }

        snapshot.forEach((productDoc) => {

            const product = productDoc.data();

            const productId = productDoc.id;

            const row = document.createElement("tr");

            row.innerHTML = `

                <td>

                    <img
                        src="${product.image || "https://via.placeholder.com/70"}"
                        alt="${product.name || "Product"}"
                    >

                </td>

                <td>
                    ${product.name || "Unnamed Product"}
                </td>

                <td>
                    ${product.sellerName || "Unknown Seller"}
                </td>

                <td>
                    ₦${Number(product.price || 0).toLocaleString()}
                </td>

                <td>

                    <button
                        class="delete-btn"
                        data-id="${productId}"
                    >

                        <i class="fas fa-trash"></i>
                        Delete

                    </button>

                </td>

            `;

            productTable.appendChild(row);

        });


        // Attach delete buttons

        document.querySelectorAll(".delete-btn").forEach((button) => {

            button.addEventListener("click", () => {

                deleteProduct(button.dataset.id);

            });

        });


    } catch (error) {

        console.error("Error loading latest products:", error);

        productTable.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;">
                    Unable to load products.
                </td>
            </tr>
        `;

    }

}


// ===============================
// DELETE PRODUCT
// ===============================

async function deleteProduct(productId) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) return;

    try {

        await deleteDoc(
            doc(db, "products", productId)
        );

        alert("Product deleted successfully.");

        // Refresh dashboard
        loadDashboard();

    } catch (error) {

        console.error("Delete error:", error);

        alert(
            "Unable to delete product. Check your Firebase permissions."
        );

    }

}


// ===============================
// LOGOUT
// ===============================

logoutBtn.addEventListener("click", async (event) => {

    event.preventDefault();

    try {

        await signOut(auth);

        window.location.href = "login.html";

    } catch (error) {

        console.error("Logout error:", error);

        alert("Logout failed.");

    }

});