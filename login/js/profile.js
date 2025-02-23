// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD6G1IdiBUFvp8QDy8r6Pw0x4skerSAk9w",
    authDomain: "project-578b8.firebaseapp.com",
    projectId: "project-578b8",
    storageBucket: "project-578b8.appspot.com",
    messagingSenderId: "340428046258",
    appId: "1:340428046258:web:2c8155d9fb915edb29aeab"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elements
const profileImage = document.getElementById("profileImage");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const loanList = document.getElementById("loanList");
const logoutBtn = document.getElementById("logoutBtn");

// Check user authentication status
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Fetch user profile and loans
        await fetchUserProfile(user.uid);
    } else {
        // Redirect to login page if not authenticated
        window.location.href = "login.html";
    }
});

// Fetch user profile from Firestore
async function fetchUserProfile(userId) {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        // Display Full Name, Email, and Profile Image
        userName.textContent = userData.fullName || "No Name Provided";
        userEmail.textContent = userData.email || "No Email";
        profileImage.src = userData.profileImage || "profile.png";

        // Fetch and display user loans
        fetchUserLoans(userId);
    } else {
        userName.textContent = "User Not Found";
        userEmail.textContent = "";
        loanList.innerHTML = "<li>No loans found</li>";
    }
}

// Fetch and display user loans from Firestore subcollection
async function fetchUserLoans(userId) {
    loanList.innerHTML = ""; // Clear previous data

    const loansCollection = collection(db, "users", userId, "loans");
    const loansSnapshot = await getDocs(loansCollection);

    if (!loansSnapshot.empty) {
        loansSnapshot.forEach((loanDoc) => {
            const loanData = loanDoc.data();
            const loanId = loanDoc.id; // Get Loan ID

            let li = document.createElement("li");
            li.innerHTML = `
                <strong>Amount:</strong> ₹${loanData.loanAmount} - 
                <span style="color: ${loanData.status === 'Approved' ? 'green' : loanData.status === 'Rejected' ? 'red' : 'black'};">
                    ${loanData.status}

                </span>
            `;

            // Make list item clickable
            li.style.cursor = "pointer";
            li.addEventListener("click", () => {
                window.location.href = `/loandet.html?loanId=${loanId}`;
            });

            loanList.appendChild(li);
        });
    } else {
        loanList.innerHTML = "<li>No loans applied</li>";
    }
}


// Logout functionality
logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "login.html"; // Redirect after logout
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
});
