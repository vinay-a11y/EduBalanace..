import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD6G1IdiBUFvp8QDy8r6Pw0x4skerSAk9w",
    authDomain: "project-578b8.firebaseapp.com",
    projectId: "project-578b8",
    storageBucket: "project-578b8.appspot.com",
    messagingSenderId: "340428046258",
    appId: "1:340428046258:web:2c8155d9fb915edb29aeab"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', function () {
    const paymentTypeSelect = document.getElementById('paymentType');
    const loanAmountField = document.getElementById('loanAmount');
    const payButton = document.getElementById('payButton');

    // Check user authentication
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await fetchLoanDetails(user);
        } else {
            alert('Please login first.');
            console.error("User not authenticated.");
        }
    });

    async function fetchLoanDetails(user) {
        const userId = user.uid;
        const loansRef = collection(db, 'users', userId, 'loans');

        try {
            const loanSnapshot = await getDocs(loansRef);

            if (!loanSnapshot.empty) {
                const loanDoc = loanSnapshot.docs[0]; // Get the first loan document
                const loanData = loanDoc.data();
                const loanDocRef = doc(db, 'users', userId, 'loans', loanDoc.id);

                console.log("Fetched Loan Data:", loanData);

                const monthlyPayment = loanData.monthlyPayment || 0;
                const yearlyPayment = loanData.yearlyPayment || 0;
                let totalPayment = loanData.totalPayment || 0;

                // Auto-update payment amount when payment type changes
                paymentTypeSelect.addEventListener('change', function () {
                    let amountToPay = 0;
                    if (paymentTypeSelect.value === 'monthly') {
                        amountToPay = monthlyPayment;
                    } else if (paymentTypeSelect.value === 'yearly') {
                        amountToPay = yearlyPayment;
                    } else if (paymentTypeSelect.value === 'total') {
                        amountToPay = totalPayment;
                    }
                    loanAmountField.value = amountToPay;
                });

                // Trigger initial update
                paymentTypeSelect.dispatchEvent(new Event('change'));

                // Handle payment
                payButton.addEventListener('click', async function () {
                    const amount = parseFloat(loanAmountField.value);
                    
                    if (isNaN(amount) || amount <= 0 || amount > totalPayment) {
                        alert("Invalid payment amount.");
                        return;
                    }

                    const transactionId = `txn_${Date.now()}`;
                    const paymentData = {
                        amount: amount,
                        email: user.email,
                        phone: loanData.phone || 'N/A',
                        productinfo: 'Loan Payment',
                        txnid: transactionId,
                    };

                    try {
                        const response = await fetch("http://localhost:5001/pay", {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(paymentData),
                        });

                        if (!response.ok) {
                            throw new Error("Failed to initiate payment.");
                        }

                        const html = await response.text(); // Get HTML response
                        const paymentWindow = window.open('', '_blank');
                        paymentWindow.document.write(html);
                        paymentWindow.document.close();

                        // Store the transaction in Firestore
                        await addDoc(collection(db, 'users', userId, 'transactions'), {
                            transactionId: transactionId,
                            amountPaid: amount,
                            date: new Date(),
                            status: "Success"
                        });

                        // Deduct the paid amount from totalPayment
                        totalPayment -= amount;
                        await updateDoc(loanDocRef, { totalPayment });

                        if (totalPayment <= 0) {
                            alert('Congratulations! You have fully paid off your loan.');
                            payButton.disabled = true;
                        }

                        alert('Payment successful and recorded.');

                    } catch (error) {
                        console.error('Payment Error:', error);
                        alert('Payment failed. Try again.');
                    }
                });

            } else {
                alert("No loan found for this user.");
                console.warn("Loan collection is empty for this user.");
            }
        } catch (error) {
            console.error("Error fetching loan details:", error);
            alert("Error fetching loan details. Check console for details.");
        }
    }
});
