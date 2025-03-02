import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Firebase Config
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

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function () {
    const transactionTableBody = document.getElementById('transactionTableBody');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await fetchTransactionHistory(user);
        } else {
            alert('Please login to view your transactions.');
            console.error("User not authenticated.");
        }
    });

    async function fetchTransactionHistory(user) {
        const userId = user.uid;
        const transactionsRef = collection(db, 'users', userId, 'transactions');

        try {
            const transactionSnapshot = await getDocs(transactionsRef);
            
            transactionTableBody.innerHTML = ""; // Clear existing data
            
            if (!transactionSnapshot.empty) {
                transactionSnapshot.forEach((doc) => {
                    const transaction = doc.data();
                    const formattedDate = new Date(transaction.createdAt).toLocaleString();
                    
                    // Append transaction row to the table
                    const row = document.createElement("tr");
                    row.classList.add("fade-in");

                    row.innerHTML = `
                        <td>${transaction.amountPaid}</td>
                        <td>${transaction.amountDue}</td>
                        <td>${transaction.attempts}</td>
                        <td>${formattedDate}</td>
                        <td>${transaction.receipt}</td>
                        <td>${transaction.transactionId}</td>
                        <td class="${transaction.status === 'Success' ? 'success' : 'failed'}">${transaction.status}</td>
                    `;

                    transactionTableBody.appendChild(row);
                });
            } else {
                transactionTableBody.innerHTML = `<tr><td colspan="7">No transactions found.</td></tr>`;
            }
        } catch (error) {
            console.error("Error fetching transactions:", error);
            alert("Error retrieving transaction history.");
        }
    }
});
