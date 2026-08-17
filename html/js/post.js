
import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const form = document.getElementById("productForm");

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const productName = document.getElementById("name").value.trim();
        const description = document.getElementById("description").value.trim();
        const category = document.getElementById("category").value;
        const price = Number(document.getElementById("price").value);
        const stock = Number(document.getElementById("stock").value);
const location = document.getElementById("location").value.trim();
        try {
            const files = document.getElementById("images").files;

let imageUrls = [];

for (let file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "Ziba_upload");

    const response = await fetch(
        "https://api.cloudinary.com/v1_1/eym2eljf/image/upload",
        {
            method: "POST",
            body: formData
        }
    );

    const data = await response.json();
    imageUrls.push(data.secure_url);
}
          await addDoc(collection(db, "products"), {

    sellerId: user.uid,
    productName,
    description,
    category,
    price,
    stock,
    location,

    imageUrls: imageUrls,

    createdAt: serverTimestamp()

});
            alert("Product added successfully!");

            form.reset();

            window.location.href = "seller-dashboard.html";

        } catch (error) {

            alert(error.message);

        }

    });

});