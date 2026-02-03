// 1. Import functions from the CDN (Web-compatible)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFHtrimwaLvmzw8x9cWynLa-H4k_rxk8I",
  authDomain: "inventory-monitoring-8584e.firebaseapp.com",
  projectId: "inventory-monitoring-8584e",
  storageBucket: "inventory-monitoring-8584e.firebasestorage.app",
  messagingSenderId: "785574810388",
  appId: "1:785574810388:web:0bd8ec834bcad6ec062801"
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- GLOBAL VARIABLES (To make functions accessible in HTML) ---
// Because 'module' scripts separate code from the HTML, we must attach functions to 'window'
window.login = login;
window.logout = logout;

// 4. Login Function
async function login() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        // Auth state listener below will handle the UI switch
        console.log("Logged in:", userCredential.user.uid);
    } catch (error) {
        errorMsg.innerText = "Error: " + error.message;
        console.error(error);
    }
}

// 5. Logout Function
function logout() {
    signOut(auth).then(() => {
        console.log("Logged out");
        location.reload();
    }).catch((error) => {
        console.error("Logout error", error);
    });
}

// 6. Real-time Auth Listener (Checks if user is already logged in)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in, check their role in Firestore
        const uid = user.uid;
        
        try {
            const userDocRef = doc(db, "users", uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role; 
                const division = userData.division || "DepEd Division";

                // UI Updates
                document.getElementById('login-section').classList.add('hidden');
                document.getElementById('dashboard-section').classList.remove('hidden');
                document.getElementById('user-role-display').innerText = `Role: ${role.toUpperCase()} - ${division}`;

                // Show specific view
                if (role === 'user') {
                    document.getElementById('user-view').classList.remove('hidden');
                } else if (role === 'admin') {
                    document.getElementById('admin-view').classList.remove('hidden');
                } else if (role === 'superadmin') {
                    document.getElementById('super-admin-view').classList.remove('hidden');
                }
            } else {
                console.log("User exists in Auth but not in Firestore Database!");
                document.getElementById('login-error').innerText = "Account not found in database. Contact Admin.";
                signOut(auth);
            }
        } catch (error) {
            console.error("Database Error:", error);
        }
    }
});