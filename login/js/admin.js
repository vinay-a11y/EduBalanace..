import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Firebase Configuration
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
const db = getFirestore(app);

async function getLoanApplications() {
    try {
        const tableBody = document.getElementById("applications-table");
        tableBody.innerHTML = ""; // Clear previous data

        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const loansCollection = collection(db, "users", userId, "loans");
            const loansSnapshot = await getDocs(loansCollection);

            loansSnapshot.forEach((loanDoc) => {
                const loanData = loanDoc.data();
                const loanId = loanDoc.id;

                const row = document.createElement("tr");
                row.id = `row-${loanId}`;
                row.innerHTML = `
                    <td>${loanData.fullName}</td>
                    <td>${loanData.email}</td>
                    <td>${loanData.course}</td>
                    <td>${loanData.loanAmount}</td>
                    <td><a href="${loanData.identityProofURL}" target="_blank">View</a></td>
                    <td><a href="${loanData.incomeProofURL}" target="_blank">View</a></td>
                    <td><a href="${loanData.loanApplicationURL}" target="_blank">View</a></td>
                    <td id="status-${loanId}" style="color: black; font-weight: bold;">${loanData.status}</td>
                    <td id="buttons-${loanId}">
                        ${loanData.status === "Pending" ? `
                            <button class="approve-btn" data-userid="${userId}" data-loanid="${loanId}" data-phone="${loanData.phone}" style="background-color: green; color: white;">Approve</button>
                            <button class="reject-btn" data-userid="${userId}" data-loanid="${loanId}" style="background-color: red; color: white;">Reject</button>
                        ` : ''}
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }

        // Attach event listeners to buttons AFTER rows are added
        document.querySelectorAll(".approve-btn").forEach(button => {
            button.addEventListener("click", function() {
                const userId = this.getAttribute("data-userid");
                const loanId = this.getAttribute("data-loanid");
                const phone = this.getAttribute("data-phone");
                updateStatus(userId, loanId, "Approved", phone);
            });
        });

        document.querySelectorAll(".reject-btn").forEach(button => {
            button.addEventListener("click", function() {
                const userId = this.getAttribute("data-userid");
                const loanId = this.getAttribute("data-loanid");
                updateStatus(userId, loanId, "Rejected");
            });
        });

    } catch (error) {
        console.error("Error retrieving loan applications:", error);
        alert("Error fetching loan applications.");
    }
}

async function updateStatus(userId, loanId, newStatus, phone = null) {
    try {
        console.log(`Updating status for User: ${userId}, Loan: ${loanId} to ${newStatus}`);

        const loanRef = doc(db, "users", userId, "loans", loanId);
        await updateDoc(loanRef, { status: newStatus });

        console.log("Update successful in Firestore");

        // Update UI
        document.getElementById(`status-${loanId}`).innerText = newStatus;
        document.getElementById(`buttons-${loanId}`).innerHTML = ""; // Remove buttons

        alert(`Loan status updated to ${newStatus}`);

        // Send SMS on approval
        if (newStatus === "Approved" && phone) {
            sendSMS(phone, "Your loan has been approved!");
        }
    } catch (error) {
        console.error("Error updating loan status:", error);
        alert("Failed to update loan status.");
    }
}

async function sendSMS(phone, message) {
    try {
        const response = await fetch("http://localhost:5001/send-sms", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ phone, message })
        });

        const data = await response.json();
        console.log("SMS Response:", data);
        alert(data.message);
    } catch (error) {
        console.error("Error sending SMS:", error);
        alert("Failed to send SMS.");
    }
}

// Load loan applications on page load
window.onload = getLoanApplications;
