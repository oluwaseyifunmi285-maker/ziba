
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// ===============================
// ELEMENTS
// ===============================

const profileName =
    document.getElementById("profileName");

const profileEmail =
    document.getElementById("profileEmail");

const accountType =
    document.getElementById("accountType");

const fullName =
    document.getElementById("fullName");

const email =
    document.getElementById("email");

const accountTypeInput =
    document.getElementById("accountTypeInput");

const saveBtn =
    document.getElementById("saveBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const profileImage =
    document.getElementById("profileImage");

const profileInitial =
    document.getElementById("profileInitial");

const profileImageInput =
    document.getElementById("profileImageInput");


// ===============================
// CURRENT USER
// ===============================

let currentUser = null;


// ===============================
// AUTH
// ===============================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;
    }

    currentUser = user;

    console.log(
        "PROFILE USER UID:",
        user.uid
    );

    console.log(
        "PROFILE USER EMAIL:",
        user.email
    );

    await loadProfile(user.uid);

});


// ===============================
// LOAD PROFILE
// ===============================

async function loadProfile(uid) {

    try {

        const userRef =
            doc(db, "users", uid);

        const userSnap =
            await getDoc(userRef);


        if (!userSnap.exists()) {

            alert("User profile not found.");

            return;
        }


        const data =
            userSnap.data();


        const name =
            data.fullName ||
            data.name ||
            "Ziba User";


        const type =
            data.accountType ||
            "user";


        profileName.textContent =
            name;

        profileEmail.textContent =
            data.email ||
            currentUser.email ||
            "";

        accountType.textContent =
            type;

        fullName.value =
            name;

        email.value =
            data.email ||
            currentUser.email ||
            "";

        accountTypeInput.value =
            type;


        // ===============================
        // PROFILE PICTURE
        // ===============================

        const photo =
            data.profilePicture ||
            data.photoURL ||
            "";


        if (photo) {

            profileImage.src =
                photo;

            profileImage.style.display =
                "block";

            profileInitial.style.display =
                "none";

        } else {

            profileImage.style.display =
                "none";

            profileInitial.style.display =
                "block";

            profileInitial.textContent =
                name
                    .charAt(0)
                    .toUpperCase();

        }

    } catch (error) {

        console.error(
            "Load profile error:",
            error
        );

        alert(
            "Unable to load profile."
        );

    }

}


// ===============================
// PROFILE IMAGE UPLOAD
// ===============================

profileImageInput.addEventListener(
    "change",
    async () => {

        const file =
            profileImageInput.files[0];


        if (!file) return;


        if (!currentUser) {

            alert(
                "Please login again."
            );

            return;
        }


        // Check file type

        if (!file.type.startsWith("image/")) {

            alert(
                "Please select an image."
            );

            profileImageInput.value = "";

            return;
        }


        // Check file size
        // Maximum 5MB

        if (file.size > 5 * 1024 * 1024) {

            alert(
                "Image must be smaller than 5MB."
            );

            profileImageInput.value = "";

            return;
        }


        try {

            console.log(
                "Uploading profile picture..."
            );


            // Show preview immediately

            const preview =
                URL.createObjectURL(file);

            profileImage.src =
                preview;

            profileImage.style.display =
                "block";

            profileInitial.style.display =
                "none";


            // ===============================
            // CLOUDINARY
            // ===============================

            const formData =
                new FormData();

            formData.append(
                "file",
                file
            );

            formData.append(
                "upload_preset",
                "Ziba_upload"
            );


            const response =
                await fetch(
                    "https://api.cloudinary.com/v1_1/eym2eljf/image/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const result =
                await response.json();


            console.log(
                "Cloudinary response:",
                result
            );


            if (!response.ok) {

                console.error(
                    "Cloudinary error:",
                    result
                );

                throw new Error(
                    result.error?.message ||
                    "Cloudinary upload failed."
                );

            }


            const imageUrl =
                result.secure_url;


            if (!imageUrl) {

                throw new Error(
                    "Cloudinary did not return an image URL."
                );

            }


            console.log(
                "Profile image URL:",
                imageUrl
            );


            // ===============================
            // SAVE URL TO FIRESTORE
            // ===============================

            const userRef =
                doc(
                    db,
                    "users",
                    currentUser.uid
                );


            await updateDoc(
                userRef,
                {
                    profilePicture:
                        imageUrl
                }
            );


            console.log(
                "Profile picture saved."
            );


            alert(
                "Profile picture updated successfully!"
            );


        } catch (error) {

            console.error(
                "Profile picture upload error:",
                error
            );


            alert(
                "Unable to upload profile picture: " +
                error.message
            );


            // Return to initial

            profileImage.style.display =
                "none";

            profileInitial.style.display =
                "block";


            profileImageInput.value = "";

        }

    }
);


// ===============================
// SAVE PROFILE
// ===============================

saveBtn.addEventListener(
    "click",
    async () => {

        const newName =
            fullName.value.trim();


        if (!newName) {

            alert(
                "Please enter your full name."
            );

            return;
        }


        if (!currentUser) {

            alert(
                "Please login again."
            );

            return;
        }


        try {

            saveBtn.disabled =
                true;

            saveBtn.innerHTML =
                `<i class="fas fa-spinner fa-spin"></i> Saving...`;


            const userRef =
                doc(
                    db,
                    "users",
                    currentUser.uid
                );


            await updateDoc(
                userRef,
                {
                    fullName: newName
                }
            );


            // Get account type

            const updatedSnap =
                await getDoc(userRef);

            const updatedData =
                updatedSnap.data();


            if (
                updatedData.accountType ===
                "seller"
            ) {

                window.location.href =
                    "seller-dashboard.html";

            } else {

                window.location.href =
                    "buyer-dashboard.html";

            }

        } catch (error) {

            console.error(
                "Save profile error:",
                error
            );

            alert(
                "Unable to update profile."
            );


            saveBtn.disabled =
                false;

            saveBtn.innerHTML =
                `<i class="fas fa-save"></i> Save Changes`;

        }

    }
);


// ===============================
// LOGOUT
// ===============================

logoutBtn.addEventListener(
    "click",
    async () => {

        try {

            await signOut(auth);

            window.location.href =
                "login.html";

        } catch (error) {

            console.error(
                "Logout error:",
                error
            );

            alert(
                "Unable to logout."
            );

        }

    }
);

