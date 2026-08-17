import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const chatList = document.getElementById("chatList");

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {

        const q = query(
            collection(db, "chats"),
            where("participants", "array-contains", user.uid)
        );

        const snapshot = await getDocs(q);

        chatList.innerHTML = "";

        if (snapshot.empty) {

            chatList.innerHTML = `
                <div class="empty">
                    <h2>No conversations yet</h2>
                    <p>Start chatting with a seller or buyer.</p>
                </div>
            `;

            return;
        }

        snapshot.forEach((doc) => {

            const chat = doc.data();

            chatList.innerHTML += `
                <div class="chat-card"
                     onclick="window.location.href='conversation.html?chatId=${doc.id}'">

                    <div class="chat-left">

                        <div class="chat-avatar">
                            ${chat.otherUserName.charAt(0).toUpperCase()}
                        </div>

                        <div class="chat-info">

                            <h3>${chat.otherUserName}</h3>

                            <p>${chat.lastMessage || "No messages yet"}</p>

                        </div>

                    </div>

                    <div class="chat-right">

                        <span class="time">
                            ${chat.lastTime || ""}
                        </span>

                    </div>

                </div>
            `;

        });

    } catch (error) {

        console.error(error);
        alert("Unable to load chats.");

    }

});
