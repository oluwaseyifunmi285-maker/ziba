import { auth, db } from "./firebase-config.js";

import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
const ordersContainer =
    document.getElementById("ordersContainer");


async function loadSellerOrders() {

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
            where("sellerId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const snapshot =
            await getDocs(q);

        if (snapshot.empty) {

            ordersContainer.innerHTML =
                "<p>No orders yet.</p>";

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
                        Buyer:
                        ${order.buyerName || "Unknown"}
                    </p>

                    <p>
                        Amount:
                        ₦${Number(order.amount || 0).toLocaleString()}
                    </p>

                    <p>
                        Payment:
                        ${order.paymentStatus || "Unknown"}
                    </p>

                    <p>
                        Order Status:
                        ${order.orderStatus || "pending"}
                    </p>
<select
    class="status-select"
    data-id="${doc.id}"
>
    <option value="pending"
        ${order.orderStatus === "pending" ? "selected" : ""}>
        Pending
    </option>

    <option value="processing"
        ${order.orderStatus === "processing" ? "selected" : ""}>
        Processing
    </option>

    <option value="shipped"
        ${order.orderStatus === "shipped" ? "selected" : ""}>
        Shipped
    </option>

    <option value="delivered"
        ${order.orderStatus === "delivered" ? "selected" : ""}>
        Delivered
    </option>
</select>
                </div>
            `;
        });

    } catch (error) {

        console.error(
            "Seller orders error:",
            error
        );

        ordersContainer.innerHTML =
            "<p>Unable to load orders.</p>";
    }
}


auth.onAuthStateChanged((user) => {

    if (user) {
        loadSellerOrders();
    } else {
        ordersContainer.innerHTML =
            "<p>Please log in first.</p>";
    }

});
document.addEventListener("change", async (event) => {

    if (!event.target.classList.contains("status-select")) {
        return;
    }

    const orderId =
        event.target.dataset.id;

    const newStatus =
        event.target.value;

    try {

        await updateDoc(
            doc(db, "orders", orderId),
            {
                orderStatus: newStatus
            }
        );

        alert("Order status updated!");

    } catch (error) {

        console.error(
            "Status update error:",
            error
        );

        alert(
            "Unable to update order status."
        );
    }

});