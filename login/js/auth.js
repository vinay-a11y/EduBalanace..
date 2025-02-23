// Import Firebase modules
import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendEmailVerification, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { 
    getFirestore, 
    setDoc, 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

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

// ==================== Registration Function ====================
window.register = async function (event) {
    event.preventDefault();
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const rePassword = document.getElementById("rePassword").value;

    if (password !== rePassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Send email verification
        await sendEmailVerification(user);

        // Store user data in Firestore
        await setDoc(doc(db, "users", user.uid), {
            fullName: fullName,
            email: email,
            uid: user.uid,
            emailVerified: false
        });

        alert("Verification email sent. Please check your inbox and verify your email before logging in.");
        window.location.href = "login.html";
    } catch (error) {
        alert("Error: " + error.message);
    }
};

// ==================== Login Function ====================
window.login = async function (event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if email is verified
        if (!user.emailVerified) {
            alert("Please verify your email before logging in.");
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            localStorage.setItem("user", JSON.stringify(userData));

            alert("Logged in successfully!");
            window.location.href = "../inn.html";
        } else {
            alert("User data not found!");
        }
    } catch (error) {
        alert("Error: " + error.message);
    }
};

// ==================== Resend Email Verification ====================
window.resendVerificationEmail = async function () {
    const user = auth.currentUser;
    if (user) {
        try {
            await sendEmailVerification(user);
            alert("Verification email resent. Please check your inbox.");
        } catch (error) {
            alert("Error sending verification email: " + error.message);
        }
    } else {
        alert("No user is currently signed in.");
    }
};

// ==================== Logout Function ====================
window.logout = function () {
    signOut(auth).then(() => {
        localStorage.removeItem("user");
        window.location.href = "login.html"; // Redirect to login page
    }).catch((error) => {
        alert("Error logging out: " + error.message);
    });
};

// ==================== Stay Logged In ====================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            localStorage.setItem("user", JSON.stringify(userData));
            updateUI(userData);
        }
    } else {
        localStorage.removeItem("user");
        updateUI(null);
    }
});

// ==================== UI Updates Based on Authentication ====================
function updateUI(user) {
    const userNameEl = document.getElementById("userName");
    const userEmailEl = document.getElementById("userEmail");
    const profileSection = document.getElementById("user-profile");
    const authBtns = document.getElementById("auth-buttons");

    if (user) {
        userNameEl.textContent = user.fullName || "User";
        userEmailEl.textContent = user.email || "No Email";
        profileSection.style.display = "block";
        authBtns.style.display = "none";
    } else {
        userNameEl.textContent = "Loading...";
        userEmailEl.textContent = "Loading...";
        profileSection.style.display = "none";
        authBtns.style.display = "block";
    }
}

// Call updateUI initially to avoid UI flicker before Firebase loads
document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem("user"));
    updateUI(user);
});
