// auth.js
const firebaseConfig = {
    apiKey: "AIzaSyDxPnmXxfno19bkj9VHP1Do97PDg0lp04s",
    authDomain: "supplies-monitoring.firebaseapp.com",
    projectId: "supplies-monitoring",
    storageBucket: "supplies-monitoring.firebasestorage.app",
    messagingSenderId: "524755577094",
    appId: "1:524755577094:web:cd3c45819698c3380a1687",
    measurementId: "G-033SS1BHK1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

function login() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');
    
    errorMsg.innerText = "Verifying...";

    auth.signInWithEmailAndPassword(email, pass)
        .then((cred) => {
            // Check Role
            db.collection('users').doc(cred.user.uid).get().then(doc => {
                if(doc.exists) {
                    const role = doc.data().role;
                    if(role === 'admin') {
                        window.location.href = "admin/admin.html";
                    } else {
                        window.location.href = "user/user.html";
                    }
                } else {
                    errorMsg.innerText = "User profile not found.";
                    auth.signOut();
                }
            });
        })
        .catch(err => errorMsg.innerText = "Login Failed: " + err.message);
}

// Make login available globally
window.login = login;
