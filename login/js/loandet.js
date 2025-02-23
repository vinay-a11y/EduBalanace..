// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", function () {
    const loanDetailsContainer = document.getElementById("loanDetails");

    function getLoanIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get("loanId");
    }

    const loanId = getLoanIdFromURL();
    if (!loanId) {
        loanDetailsContainer.innerHTML = "<p class='text-danger fs-4'>⚠️ Error: Loan ID not found.</p>";
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            loanDetailsContainer.innerHTML = "<p class='text-danger fs-4'>⚠️ Error: You must be logged in to view loan details.</p>";
            return;
        }

        const uid = user.uid;
        try {
            const loanRef = doc(db, "users", uid, "loans", loanId);
            const loanSnap = await getDoc(loanRef);

            if (loanSnap.exists()) {
                const loanData = loanSnap.data();

                const maskedAccountNumber = loanData.accountnumber ? "XXXXXX" + loanData.accountnumber.slice(-4) : "N/A";
                const maskedIFSC = loanData.ifsc ? loanData.ifsc.slice(0, 4) + "***" : "N/A";
                const formattedLoanAmount = loanData.loanAmount ? `₹${loanData.loanAmount.toLocaleString()}` : "N/A";
                const formattedMonthlyPayment = loanData.monthlyPayment ? `₹${loanData.monthlyPayment.toLocaleString()}` : "N/A";
                const formattedYearlyPayment = loanData.yearlyPayment ? `₹${loanData.yearlyPayment.toLocaleString()}` : "N/A";
                const formattedTotalPayment = loanData.totalPayment ? `₹${loanData.totalPayment.toLocaleString()}` : "N/A";
                const formattedAppliedDate = loanData.appliedAt ? loanData.appliedAt.toDate().toLocaleDateString() : "N/A";

                loanDetailsContainer.innerHTML = `
                    <style>
                        table {
                            font-size: 20px;
                            width: 100%;
                            margin-top: 20px;
                            border-collapse: collapse;
                        }
                        th, td {
                            padding: 12px;
                            text-align: left;
                            border: 2px solid #ddd;
                        }
                        th {
                            background-color: #f8f9fa;
                            font-weight: bold;
                        }
                    </style>

                    <table class="table table-bordered table-striped">
                        <tr><th>Full Name</th><td>${loanData.fullName || "N/A"}</td></tr>
                        <tr><th>Phone</th><td>${loanData.phone || "N/A"}</td></tr>
                        <tr><th>Bank Name</th><td>${loanData.bankname || "N/A"}</td></tr>
                        <tr><th>Account Number</th><td>${maskedAccountNumber}</td></tr>
                        <tr><th>IFSC</th><td>${maskedIFSC}</td></tr>
                        <tr><th>Loan Amount</th><td>${formattedLoanAmount}</td></tr>
                        <tr><th>Repayment Period</th><td>${loanData.repaymentPeriod ? loanData.repaymentPeriod + " years" : "N/A"}</td></tr>
                        <tr><th>Loan Type</th><td>${loanData.loanType || "N/A"}</td></tr>
                        <tr><th>Interest Rate</th><td>${loanData.interestRate ? loanData.interestRate + "%" : "N/A"}</td></tr>
                        <tr><th>Monthly Payment</th><td>${formattedMonthlyPayment}</td></tr>
                        <tr><th>Yearly Payment</th><td>${formattedYearlyPayment}</td></tr>
                        <tr><th>Total Payment</th><td>${formattedTotalPayment}</td></tr>
                        <tr><th>Loan Status</th><td>${loanData.status || "N/A"}</td></tr>
                        <tr><th>Applied On</th><td>${formattedAppliedDate}</td></tr>
                    </table>
                `;
            } else {
                loanDetailsContainer.innerHTML = "<p class='text-warning fs-4'>⚠️ Loan details not found.</p>";
            }
        } catch (error) {
            console.error("Error fetching loan details:", error);
            loanDetailsContainer.innerHTML = "<p class='text-danger fs-4'>❌ Error retrieving loan details. Please try again.</p>";
        }
    });
});
