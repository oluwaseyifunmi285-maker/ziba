import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const chatId = params.get("chatId");

const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let currentUser = null;

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;

    loadMessages();

});

function loadMessages() {

    const q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("time", "asc")
    );

    onSnapshot(q, (snapshot) => {

        messages.innerHTML = "";

        snapshot.forEach((doc) => {

            const data = doc.data();

            const div = document.createElement("div");

            if (data.senderId === currentUser.uid) {

                div.className = "my-message";

            } else {

                div.className = "other-message";

            }

            div.textContent = data.message;

            messages.appendChild(div);

        });

        messages.scrollTop = messages.scrollHeight;

    });

}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keypress", (e) => {

    if (e.key === "Enter") {

        sendMessage();

    }

});

async function sendMessage() {

    const text = messageInput.value.trim();

    if (text === "") return;

    await addDoc(collection(db, "chats", chatId, "messages"), {

        senderId: currentUser.uid,

        message: text,

        time: serverTimestamp()

    });

    messageInput.value = "";

}