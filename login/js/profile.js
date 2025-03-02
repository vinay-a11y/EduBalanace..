// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
        await fetchUserProfile(user.uid);
    } else {
        window.location.href = "login.html"; // Redirect if not logged in
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
            const loanId = loanDoc.id;

            const isApproved = loanData.status === "Approved";
            const isPaid = loanData.loanAmount <= 0;

            if (!isPaid) {
                let li = document.createElement("li");
                li.dataset.loanId = loanId;
                li.innerHTML = `
                    <strong>Amount:</strong> ₹${loanData.loanAmount} - 
                    <span style="color: ${loanData.status === 'Approved' ? 'green' : loanData.status === 'Rejected' ? 'red' : 'black'};">
                        ${loanData.status}
                    </span>
                    <div class="loan-buttons">
                        <button class="pay-btn" data-loan-id="${loanId}" ${isApproved ? "" : "disabled"}>Pay Loan</button>
                        <button class="transaction-btn" data-loan-id="${loanId}" ${isApproved ? "" : "disabled"}>Transaction Details</button>
                        <button class="details-btn" data-loan-id="${loanId}">View Details</button>
                    </div>
                `;
                
                // Append loan entry to list
                loanList.appendChild(li);
            }
        });

        if (loanList.children.length === 0) {
            loanList.innerHTML = "<li>No active loans</li>";
        }

        // Add event listeners for buttons after they are created
        document.querySelectorAll(".pay-btn").forEach(button => {
            button.addEventListener("click", async (event) => {
                const loanId = event.target.getAttribute("data-loan-id");
                await processLoanPayment(auth.currentUser.uid, loanId);
            });
        });

        document.querySelectorAll(".transaction-btn").forEach(button => {
            button.addEventListener("click", (event) => {
                const loanId = event.target.getAttribute("data-loan-id");
                window.location.href = `/htmls/transaction.html?loanId=${loanId}`;
            });
        });

        document.querySelectorAll(".details-btn").forEach(button => {
            button.addEventListener("click", (event) => {
                const loanId = event.target.getAttribute("data-loan-id");
                window.location.href = `/htmls/loandet.html?loanId=${loanId}`;
            });
        });
    } else {
        loanList.innerHTML = "<li>No loans applied</li>";
    }
}

// Process loan payment and remove from UI if fully paid
async function processLoanPayment(userId, loanId) {
    const loanRef = doc(db, "users", userId, "loans", loanId);
    const loanSnap = await getDoc(loanRef);

    if (loanSnap.exists()) {
        const loanData = loanSnap.data();
        let updatedAmount = loanData.loanAmount - 500; // Simulated payment deduction

        if (updatedAmount <= 0) {
            updatedAmount = 0; // Ensure it doesn't go negative
        }

        await updateDoc(loanRef, { loanAmount: updatedAmount });

        const loanItem = document.querySelector(`li[data-loan-id='${loanId}']`);

        if (updatedAmount === 0) {
            // Remove the loan entry from UI
            if (loanItem) {
                loanItem.remove();
            }

            // If no loans remain, show "No active loans" message
            if (loanList.children.length === 0) {
                loanList.innerHTML = "<li>No active loans</li>";
            }
        } else {
            // Update the displayed loan amount
            if (loanItem) {
                loanItem.querySelector("strong").textContent = `Amount: ₹${updatedAmount}`;
            }
        }
    }
}

// Logout functionality
logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "/index.html"; // Redirect after logout
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
});
