
import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const displayName = document.getElementById("displayName");
const userEmail = document.getElementById("userEmail");

const fullName = document.getElementById("fullName");
const email = document.getElementById("email");
const phone = document.getElementById("phone");
const location = document.getElementById("location");
const bio = document.getElementById("bio");

const profileForm = document.getElementById("profileForm");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;

onAuthStateChanged(auth, async(user)=>{

    if(!user){

        window.location.href="login.html";
        return;

    }

    currentUser = user;

    email.value = user.email;
    userEmail.textContent = user.email;

    loadProfile();

});

async function loadProfile(){

    try{

        const userRef = doc(db,"users",currentUser.uid);

        const userSnap = await getDoc(userRef);

        if(userSnap.exists()){

            const data = userSnap.data();

            displayName.textContent = data.fullName || "Ziba User";

            fullName.value = data.fullName || "";
            phone.value = data.phone || "";
            location.value = data.location || "";
            bio.value = data.bio || "";

        }else{

            displayName.textContent = "New User";

        }

    }catch(error){

        console.log(error);

    }

}

profileForm.addEventListener("submit",async(e)=>{

    e.preventDefault();

    try{

        await setDoc(doc(db,"users",currentUser.uid),{

            fullName: fullName.value,
            email: currentUser.email,
            phone: phone.value,
            location: location.value,
            bio: bio.value

        },{merge:true});

        displayName.textContent = fullName.value;

        alert("Profile updated successfully!");

    }catch(error){

        console.log(error);

        alert("Unable to update profile.");

    }

});

logoutBtn.addEventListener("click",async()=>{

    if(confirm("Do you want to logout?")){

        await signOut(auth);

        window.location.href="login.html";

    }

});

document.querySelector(".my-products").addEventListener("click",()=>{

    window.location.href="manage-products.html";

});

document.querySelector(".wishlist").addEventListener("click",()=>{

    window.location.href="wishlist.html";

});

document.querySelector(".messages").addEventListener("click",()=>{

    window.location.href="chat.html";

});

