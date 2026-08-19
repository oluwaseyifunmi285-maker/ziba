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
    serverTimestamp,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const chatId = params.get("chatId");

const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatName = document.getElementById("chatName");
const avatar = document.querySelector(".avatar");

let currentUser = null;


// ===============================
// AUTH
// ===============================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    if (!chatId) {
        alert("Chat not found.");
        window.location.href = "chat.html";
        return;
    }

    currentUser = user;

    console.log("Current user:", currentUser.uid);
    console.log("Chat ID:", chatId);

    await loadChatUser();

    // Mark messages as read when conversation opens
    await markChatAsRead();

    loadMessages();

});


// ===============================
// LOAD OTHER USER
// ===============================

async function loadChatUser() {

    try {

        const chatRef = doc(db, "chats", chatId);

        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {

            chatName.textContent = "Chat not found";
            return;

        }

        const chat = chatSnap.data();

        const participants = chat.participants || [];

        const otherUserId = participants.find(
            id => id !== currentUser.uid
        );

        console.log("Participants:", participants);
        console.log("Other user:", otherUserId);

        if (!otherUserId) {

            chatName.textContent = "Ziba User";
            return;

        }

        console.log(
            "Looking for user document:",
            otherUserId
        );

        const userRef = doc(db, "users", otherUserId);

        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {

            const userData = userSnap.data();

            const name =
                userData.fullName ||
                userData.name ||
                "Ziba User";

            chatName.textContent = name;

            const photo =
                userData.profilePicture ||
                userData.photoURL ||
                "";

            if (photo) {

                avatar.innerHTML = `
                    <img
                        src="${photo}"
                        alt="${name}"
                    >
                `;

            } else {

                avatar.textContent =
                    name.charAt(0).toUpperCase();

            }

        } else {

            console.log(
                "User document not found:",
                otherUserId
            );

            chatName.textContent = "Ziba User";

            avatar.textContent = "?";

        }

    } catch (error) {

        console.error(
            "Load chat user error:",
            error
        );

        chatName.textContent = "Ziba User";

    }

}


// ===============================
// MARK CHAT AS READ
// ===============================

async function markChatAsRead() {

    try {

        const chatRef = doc(db, "chats", chatId);

        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
            return;
        }

        const chat = chatSnap.data();

        const unread = chat.unread || {};

        unread[currentUser.uid] = 0;

        await updateDoc(chatRef, {
            unread: unread
        });

        console.log(
            "Unread messages cleared for:",
            currentUser.uid
        );

    } catch (error) {

        console.error(
            "Mark chat as read error:",
            error
        );

    }

}


// ===============================
// LOAD MESSAGES
// ===============================

function loadMessages() {

    const q = query(
        collection(
            db,
            "chats",
            chatId,
            "messages"
        ),
        orderBy("time", "asc")
    );

    onSnapshot(q, (snapshot) => {

        messages.innerHTML = "";

        snapshot.forEach((messageDoc) => {

            const data = messageDoc.data();

            const div =
                document.createElement("div");

            console.log(
                "Message sender:",
                data.senderId,
                "Current user:",
                currentUser.uid
            );

            // Current user = RIGHT
            // Other user = LEFT

            if (
                data.senderId === currentUser.uid
            ) {

                div.className = "my-message";

            } else {

                div.className = "other-message";

            }

            div.textContent =
                data.message || "";

            messages.appendChild(div);

        });

        messages.scrollTop =
            messages.scrollHeight;

    }, (error) => {

        console.error(
            "Message listener error:",
            error
        );

    });

}


// ===============================
// SEND MESSAGE
// ===============================

sendBtn.addEventListener(
    "click",
    sendMessage
);


messageInput.addEventListener(
    "keypress",
    (e) => {

        if (e.key === "Enter") {

            e.preventDefault();

            sendMessage();

        }

    }
);

// ===============================
// CHAT / PAYMENT PROTECTION
// ===============================

function isUnsafeMessage(text) {

    const message = text.toLowerCase();

    // ===============================
    // EMAIL ADDRESS
    // ===============================

    const emailPattern =
        /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;


    // ===============================
    // NIGERIAN PHONE NUMBERS
    // ===============================

    const phonePattern =
        /(?:\+234|0)[789][01]\d{8}/;


    // ===============================
    // PAYMENT / BANK WORDS
    // ===============================

    const paymentWords = [
        "account number",
        "acct number",
        "account no",
        "acct no",
        "bank account",
        "send to my account",
        "pay into",
        "transfer to",
        "transfer money",
        "send money",
        "bank details",
        "bank details",
        "account details",
        "my bank",
        "payment details",
        "pay me directly",
        "pay directly",
        "send payment",
        "transfer",
        "gtbank",
        "gt bank",
        "access bank",
        "first bank",
        "uba",
        "zenith bank",
        "opay",
        "moniepoint",
        "palmpay"
    ];


    // ===============================
    // SOCIAL / EXTERNAL CONTACT
    // ===============================

    const externalContactWords = [
        "whatsapp me",
        "whatsapp",
        "call me",
        "text me",
        "telegram",
        "instagram",
        "facebook",
        "dm me",
        "contact me outside",
        "message me outside"
    ];


    // ===============================
    // CHECK EMAIL
    // ===============================

    if (emailPattern.test(text)) {

        return {
            blocked: true,
            reason:
                "Email addresses cannot be shared in Ziba chat."
        };

    }


    // ===============================
    // CHECK PHONE
    // ===============================

    if (phonePattern.test(text)) {

        return {
            blocked: true,
            reason:
                "Phone numbers cannot be shared in Ziba chat."
        };

    }


    // ===============================
    // CHECK PAYMENT WORDS
    // ===============================

    for (const word of paymentWords) {

        if (message.includes(word)) {

            return {
                blocked: true,
                reason:
                    "For your safety, please keep payments on Ziba. Do not share bank or payment details in chat."
            };

        }

    }


    // ===============================
    // CHECK EXTERNAL CONTACT
    // ===============================

    for (const word of externalContactWords) {

        if (message.includes(word)) {

            return {
                blocked: true,
                reason:
                    "For your safety, please keep communication and transactions on Ziba."
            };

        }

    }


    // ===============================
    // MESSAGE IS SAFE
    // ===============================

    return {
        blocked: false,
        reason: ""
    };

}


// ===============================
// SEND MESSAGE
// ===============================

async function sendMessage() {

    const text =
        messageInput.value.trim();


    if (text === "") return;


    if (!currentUser) return;


    // ===============================
    // CHECK MESSAGE BEFORE SENDING
    // ===============================

    const protection =
        isUnsafeMessage(text);


    if (protection.blocked) {

        alert(
            "⚠️ Ziba Safety\n\n" +
            protection.reason
        );

        return;

    }


    try {

        // ===============================
        // ADD MESSAGE
        // ===============================

        await addDoc(
            collection(
                db,
                "chats",
                chatId,
                "messages"
            ),
            {

                senderId:
                    currentUser.uid,

                message:
                    text,

                time:
                    serverTimestamp()

            }
        );


        // ===============================
        // UPDATE CHAT PREVIEW
        // ===============================

        await updateDoc(
            doc(
                db,
                "chats",
                chatId
            ),
            {

                lastMessage:
                    text,

                lastMessageAt:
                    serverTimestamp()

            }
        );


        // ===============================
        // CLEAR INPUT
        // ===============================

        messageInput.value = "";

        messageInput.focus();


    } catch (error) {

        console.error(
            "Send message error:",
            error
        );

        alert(
            "Unable to send message."
        );

    }

}

