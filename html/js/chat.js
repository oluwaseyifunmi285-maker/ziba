import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


const chatList =
    document.getElementById("chatList");


// ===============================
// AUTH
// ===============================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href =
            "login.html";

        return;

    }

    loadChats(user.uid);

});


// ===============================
// LOAD CHATS REAL-TIME
// ===============================

function loadChats(currentUserId) {

    const q =
        query(
            collection(db, "chats"),
            where(
                "participants",
                "array-contains",
                currentUserId
            )
        );


    onSnapshot(
        q,
        async (snapshot) => {

            chatList.innerHTML = "";


            if (snapshot.empty) {

                showEmpty();

                return;

            }


            const chats = [];


            // Get chat data first
            for (const chatDoc of snapshot.docs) {

                const chat =
                    chatDoc.data();


                const participants =
                    chat.participants || [];


                const otherUserId =
                    participants.find(
                        id => id !== currentUserId
                    );


                if (!otherUserId) {
                    continue;
                }


                chats.push({

                    id: chatDoc.id,

                    chat: chat,

                    otherUserId:
                        otherUserId

                });

            }


            // Sort newest first
            chats.sort((a, b) => {

                const timeA =
                    a.chat.lastMessageAt?.toMillis?.() || 0;

                const timeB =
                    b.chat.lastMessageAt?.toMillis?.() || 0;

                return timeB - timeA;

            });


            // Build each conversation
            for (const item of chats) {

                await createChatCard(
                    item,
                    currentUserId
                );

            }

        },

        (error) => {

            console.error(
                "Chat listener error:",
                error
            );


            chatList.innerHTML = `

                <div class="empty">

                    <i class="fas fa-triangle-exclamation"></i>

                    <h3>Unable to load chats</h3>

                    <p>Please try again.</p>

                </div>

            `;

        }

    );

}


// ===============================
// CREATE CHAT CARD
// ===============================

async function createChatCard(
    item,
    currentUserId
) {

    const chat =
        item.chat;

    const otherUserId =
        item.otherUserId;


    // ===============================
    // LOAD USER PROFILE
    // ===============================

    let otherUser = {};


    try {

        const userRef =
            doc(
                db,
                "users",
                otherUserId
            );


        const userSnap =
            await getDoc(userRef);


        if (userSnap.exists()) {

            otherUser =
                userSnap.data();

        }

    } catch (error) {

        console.error(
            "Unable to load chat user:",
            error
        );

    }


    // ===============================
    // USER NAME
    // ===============================

    const otherUserName =
        otherUser.fullName ||
        otherUser.name ||
        otherUser.displayName ||
        "Ziba User";


    // ===============================
    // PROFILE PICTURE
    // ===============================

    const profilePicture =
        otherUser.profilePicture ||
        otherUser.photoURL ||
        otherUser.profileImage ||
        "";


    const firstLetter =
        otherUserName
            .charAt(0)
            .toUpperCase();


    let avatar;


    if (profilePicture) {

        avatar = `

            <img
                src="${profilePicture}"
                alt="${otherUserName}"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            >

            <span style="display:none;">
                ${firstLetter}
            </span>

        `;

    } else {

        avatar = `

            <span>
                ${firstLetter}
            </span>

        `;

    }


    // ===============================
    // UNREAD COUNT
    // ===============================

    const unread =
        chat.unread || {};


    const unreadCount =
        Number(
            unread[currentUserId] || 0
        );


    // ===============================
    // LAST MESSAGE
    // ===============================

    const lastMessage =
        chat.lastMessage ||
        "No messages yet";


    // ===============================
    // TIME
    // ===============================

    const time =
        formatTime(
            chat.lastMessageAt
        );


    // ===============================
    // CARD
    // ===============================

    const card =
        document.createElement("div");


    card.className =
        "chat-card";


    if (unreadCount > 0) {

        card.classList.add(
            "unread"
        );

    }


    card.innerHTML = `

        <div class="chat-left">

            <div class="chat-avatar">

                ${avatar}

            </div>


            <div class="chat-info">

                <h3>
                    ${escapeHTML(
                        otherUserName
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        lastMessage
                    )}
                </p>

            </div>

        </div>


        <div class="chat-right">

            <span class="time">
                ${time}
            </span>


            ${
                unreadCount > 0

                ? `

                    <span class="badge">

                        ${
                            unreadCount > 99
                                ? "99+"
                                : unreadCount
                        }

                    </span>

                `

                : ""

            }

        </div>

    `;


    // ===============================
    // OPEN CONVERSATION
    // ===============================

    card.addEventListener(
        "click",
        () => {

            window.location.href =
                `conversation.html?chatId=${item.id}`;

        }
    );


    chatList.appendChild(card);

}


// ===============================
// EMPTY CHAT
// ===============================

function showEmpty() {

    chatList.innerHTML = `

        <div class="empty">

            <i class="fas fa-comments"></i>

            <h3>No conversations yet</h3>

            <p>
                Start chatting with a buyer or seller.
            </p>

        </div>

    `;

}


// ===============================
// FORMAT TIME
// ===============================

function formatTime(timestamp) {

    if (!timestamp) {
        return "";
    }


    if (timestamp.toDate) {

        const date =
            timestamp.toDate();


        return date.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    return "";

}


// ===============================
// SECURITY / HTML ESCAPE
// ===============================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}