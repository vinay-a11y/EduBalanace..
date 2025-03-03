import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// ✅ Initialize Firebase
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

    // ✅ Check User Authentication
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await fetchLoanDetails(user);
        } else {
            alert('Please login first.');
            console.error("❌ User not authenticated.");
        }
    });

    // ✅ Fetch Razorpay Key
    async function getRazorpayKey() {
        try {
            const response = await fetch("http://localhost:5001/get-razorpay-key");
            const data = await response.json();
            if (!data.key) throw new Error("Razorpay key not received.");
            return data.key;
        } catch (error) {
            console.error("❌ Error fetching Razorpay key:", error);
            alert("Failed to load payment gateway.");
            throw error;
        }
    }

    // ✅ Fetch Loan Details from Firestore
    async function fetchLoanDetails(user) {
        const userId = user.uid;
        const loansRef = collection(db, 'users', userId, 'loans');

        try {
            const loanSnapshot = await getDocs(loansRef);
            if (loanSnapshot.empty) {
                alert("No loan found for this user.");
                console.warn("⚠️ Loan collection is empty for this user.");
                return;
            }

            const loanDoc = loanSnapshot.docs[0]; // Get first loan document
            const loanData = loanDoc.data();
            const loanDocRef = doc(db, 'users', userId, 'loans', loanDoc.id);

            console.log("✔️ Loan Data Fetched.");

            const monthlyPayment = loanData.monthlyPayment || 0;
            const yearlyPayment = loanData.yearlyPayment || 0;
            let totalPayment = loanData.totalPayment || 0;

            // 🔹 Auto-update payment amount based on selection
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

            // 🔹 Trigger initial update
            paymentTypeSelect.dispatchEvent(new Event('change'));

            // ✅ Handle Payment
            payButton.addEventListener('click', async function () {
                const amount = parseFloat(loanAmountField.value);
                
                if (isNaN(amount) || amount <= 0 || amount > totalPayment) {
                    alert("Invalid payment amount.");
                    return;
                }

                payButton.disabled = true;
                payButton.innerText = "Processing...";

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

                    if (!response.ok) throw new Error("Failed to initiate payment.");

                    const data = await response.json();
                    if (!data.success) {
                        alert("Payment initiation failed.");
                        return;
                    }

                    // ✅ Use Razorpay SDK for payment
                    const razorpayKey = await getRazorpayKey();
                    const options = {
                        key: razorpayKey,
                        amount: amount * 100,  // Convert to paisa
                        currency: "INR",
                        name: "Loan Payment",
                        description: "Loan EMI Payment",
                        order_id: data.order.id,
                        handler: async function (response) {
                            alert("✔️ Payment successful!");

                            const transactionData = {
                                id: data.order.id,
                                amount_due: amount * 100,
                                amount_paid: amount * 100,
                                attempts: 1,  
                                created_at: Math.floor(Date.now() / 1000),
                                currency: "INR",
                                entity: "order",
                                offer_id: null,  
                                receipt: transactionId,  
                                status: "Success"
                            };

                            await storeTransaction(userId, transactionData);

                            // ✅ Deduct paid amount from totalPayment
                            totalPayment -= amount;
                            await updateDoc(loanDocRef, { totalPayment });

                            if (totalPayment <= 0) {
                                alert('🎉 Congratulations! You have fully paid off your loan.');
                                payButton.disabled = true;
                            }
                        },
                        prefill: {
                            email: user.email,
                            contact: loanData.phone || "N/A",
                        },
                        theme: { color: "#3399cc" }
                    };

                    const rzp1 = new Razorpay(options);
                    rzp1.open();

                } catch (error) {
                    console.error('❌ Payment Error:', error);
                    alert('⚠️ Payment failed. Try again.');
                } finally {
                    payButton.disabled = false;
                    payButton.innerText = "Pay Now";
                }
            });

        } catch (error) {
            console.error("❌ Error fetching loan details:", error);
            alert("⚠️ Error fetching loan details. Check console for details.");
        }
    }

    // ✅ Store Transaction in Firestore
    async function storeTransaction(userId, transactionData) {
        try {
            const transactionRef = collection(db, 'users', userId, 'transactions');
            await addDoc(transactionRef, {
                transactionId: transactionData.id,
                amountDue: transactionData.amount_due / 100,
                amountPaid: transactionData.amount_paid / 100,
                attempts: transactionData.attempts,
                createdAt: new Date(transactionData.created_at * 1000).toISOString(),
                currency: transactionData.currency,
                entity: transactionData.entity,
                offerId: transactionData.offer_id || null,
                receipt: transactionData.receipt,
                status: transactionData.status
            });

            console.log("✔️ Transaction stored successfully.");
            window.location.href="transaction.html"
            alert('✔️ Payment recorded successfully.');
        } catch (error) {
            console.error("❌ Error storing transaction:", error);
            alert("⚠️ Failed to record transaction.");
        }
    }
});
