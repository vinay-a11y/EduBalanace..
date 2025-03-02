// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

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

// Cloudinary Configuration
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dit3n5kma/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "applicationform"; // Found in Cloudinary settings

// Function to upload a file to Cloudinary
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: "POST",
            body: formData,
        });
        const data = await response.json();
        return data.secure_url; // Returns the uploaded file URL
    } catch (error) {
        console.error("Error uploading file:", error);
        alert("File upload failed. Please try again.");
        return null;
    }
}

// Loan Application Form Submission
async function submitApplication(event) {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to apply for a loan.");
        return;
    }

    const uid = user.uid;
    const phoneInput = document.getElementById("phone");

    // Ensure intlTelInput is initialized properly
    const iti = window.intlTelInputGlobals.getInstance(phoneInput);
    if (!iti) {
        alert("Phone input not initialized correctly.");
        return;
    }

    // Get full phone number with country code
    const fullPhoneNumber = iti.getNumber();

    // Debugging: Check phone number before storing
    console.log("Full Phone Number:", fullPhoneNumber);

    // Validate phone number
    if (!iti.isValidNumber()) {
        alert("Please enter a valid phone number.");
        return;
    }

    // Get form values
    const fullName = document.getElementById("full-name").value.trim();
    const dob = document.getElementById("dob").value;
    const email = document.getElementById("email").value.trim();
    const loanAmount = parseFloat(document.getElementById("loan-amount").value.trim());
    const repaymentPeriod = parseInt(document.getElementById("repayment-period").value);
    const loanType = document.getElementById("loanType").value;
    const university = document.getElementById("university").value;
    const duration = document.getElementById("duration").value;
    const course = document.getElementById("course").value;
    const bankname = document.getElementById("bank-name").value;
    const accountnumber = document.getElementById("account-number").value;
    const ifsc = document.getElementById("ifsc").value;

    // Get file inputs
    const identityProof = document.getElementById("identity-proof").files[0];
    const incomeProof = document.getElementById("income-proof").files[0];
    const loanApplication = document.getElementById("loan-application").files[0];

    // **Input Validations**
    if (!fullName || !dob || !email || isNaN(loanAmount) || isNaN(repaymentPeriod) || !loanType) {
        alert("Please fill in all required fields.");
        return;
    }

    if (loanAmount <= 0 || repaymentPeriod <= 0) {
        alert("Loan amount and repayment period must be greater than zero.");
        return;
    }

    if (!identityProof || !incomeProof || !loanApplication) {
        alert("Please upload all required documents.");
        return;
    }

    // **Loan Calculation**
    let rate;
    switch (loanType) {
        case "simple": rate = 8; break;
        case "floating": rate = 4; break;
        case "compound": rate = 6; break;
        default:
            alert("Invalid loan type selected.");
            return;
    }

    let yearlyInterest = (loanAmount * rate) / 100;
    let totalInterest = yearlyInterest * repaymentPeriod;
    let totalAmount = loanType === "compound"
        ? loanAmount * Math.pow(1 + rate / 100, repaymentPeriod)
        : loanAmount + totalInterest;

    let yearlyPayment = totalAmount / repaymentPeriod;
    let monthlyPayment = yearlyPayment / 12;

    try {
        // Upload files to Cloudinary
        const identityProofURL = await uploadToCloudinary(identityProof);
        const incomeProofURL = await uploadToCloudinary(incomeProof);
        const loanApplicationURL = await uploadToCloudinary(loanApplication);

        if (!identityProofURL || !incomeProofURL || !loanApplicationURL) {
            alert("File upload failed. Please try again.");
            return;
        }

        // Store loan application in Firestore with uploaded file URLs
        await addDoc(collection(db, "users", uid, "loans"), {
            fullName,
            dob,
            phone: fullPhoneNumber, // ✅ Fixed phone number storage
            email,
            university, course, duration,
            bankname, accountnumber, ifsc,
            loanAmount,
            repaymentPeriod,
            loanType,
            interestRate: rate,
            monthlyPayment: monthlyPayment.toFixed(2),
            yearlyPayment: yearlyPayment.toFixed(2),
            totalPayment: totalAmount.toFixed(2),
            identityProofURL,
            incomeProofURL,
            loanApplicationURL,
            status: "Pending",
            appliedAt: new Date()
        });

        console.log("Application successfully submitted with phone:", fullPhoneNumber);
        alert("Application submitted successfully!");
        window.location.href = "/login/profile.html"; // Redirect to success page
    } catch (error) {
        console.error("Error submitting form:", error);
        alert("Error submitting application. Please try again.");
    }
}

// Attach function to form submit button after DOM is loaded
window.onload = function () {
    const form = document.getElementById("loanApplicationForm");
    if (form) {
        form.addEventListener("submit", submitApplication);
    } else {
        console.error("Form not found! Check the form ID in HTML.");
    }
};

// Loan Calculation Function
function calculateLoan() {
    let amount = parseFloat(document.getElementById("loan-amount").value);
    let type = document.getElementById("loanType").value;
    let years = parseInt(document.getElementById("repayment-period").value);

    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid loan amount.");
        return;
    }

    let rate = type === "simple" ? 8 : type === "floating" ? 4 : 6;
    let yearlyInterest = (amount * rate) / 100;
    let totalInterest = yearlyInterest * years;

    let totalAmount;
    if (type === "compound") {
        totalAmount = amount * Math.pow(1 + rate / 100, years); // Compound Interest formula
    } else {
        totalAmount = amount + totalInterest; // Simple/Floating Interest
    }

    let yearlyPayment = totalAmount / years;
    let monthlyPayment = yearlyPayment / 12;

    let resultDiv = document.getElementById("loanResult");
    if (!resultDiv) {
        console.error("Element with id 'loanResult' not found.");
        return;
    }

    resultDiv.innerHTML = `
        <h3>Loan Calculation Result</h3>
        <strong>Loan Type:</strong> ${type.toUpperCase()}<br>
        <strong>Monthly Payment:</strong> ₹${monthlyPayment.toFixed(2)}<br>
        <strong>Yearly Payment:</strong> ₹${yearlyPayment.toFixed(2)}<br>
        <strong>Total Payment (${years} years):</strong> ₹${totalAmount.toFixed(2)}
    `;
    resultDiv.style.display = "block";
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("calculateBtn").addEventListener("click", calculateLoan);
});
document.addEventListener("DOMContentLoaded", function() {
    var input = document.querySelector("#phone");
    window.intlTelInput(input, {
        separateDialCode: true, // Shows country code separately
        initialCountry: "in", // Default country (India)
        preferredCountries: ["in", "us", "gb"], // Preferred country list
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js"
    });
});