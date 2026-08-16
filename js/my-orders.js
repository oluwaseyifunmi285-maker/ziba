import { auth, db } from "./firebase-config.js";

import {
    collection,
    query,
    where,
    getDocs,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const ordersContainer =
    document.getElementById("ordersContainer");


async function loadMyOrders() {

    const user = auth.currentUser;

    if (!user) {
        ordersContainer.innerHTML =
            "<p>Please log in to view your orders.</p>";
        return;
    }

    try {

        const ordersRef =
            collection(db, "orders");

        const q = query(
            ordersRef,
            where("buyerId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const snapshot =
            await getDocs(q);

        if (snapshot.empty) {

            ordersContainer.innerHTML =
                "<p>You have no orders yet.</p>";

            return;
        }

        ordersContainer.innerHTML = "";

        snapshot.forEach((doc) => {

            const order = doc.data();

            ordersContainer.innerHTML += `
                <div class="order-card">

                    <h2>
                        ${order.productName || "Product"}
                    </h2>

                    <p>
                        Amount:
                        ₦${Number(order.amount || 0).toLocaleString()}
                    </p>

                    <p>
                        Payment:
                        <strong>
                            ${order.paymentStatus || "Unknown"}
                        </strong>
                    </p>

                    <p>
                        Order Status:
                        <strong>
                            ${order.orderStatus || "pending"}
                        </strong>
                    </p>

                    <p>
                        Seller:
                        ${order.sellerId || "Unknown"}
                    </p>

                </div>
            `;
        });

    } catch (error) {

        console.error(
            "My orders error:",
            error
        );

        ordersContainer.innerHTML =
            "<p>Unable to load your orders.</p>";
    }
}


auth.onAuthStateChanged((user) => {

    if (user) {
        loadMyOrders();
    } else {
        ordersContainer.innerHTML =
            "<p>Please log in first.</p>";
    }

});