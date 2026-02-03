// admin/admin.js

// 1. CONFIGURATION
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

// 2. CHECK AUTH
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "../index.html";
    } else {
        // Verify Admin Role
        db.collection('users').doc(user.uid).get().then(doc => {
            if(doc.data().role !== 'admin') {
                window.location.href = "../user/user.html";
            } else {
                initAdminDashboard();
            }
        });
    }
});

function logout() {
    auth.signOut().then(() => window.location.href = "../index.html");
}

function nav(id, btn) {
    document.querySelectorAll('.section').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(e => e.classList.remove('active'));
    btn.classList.add('active');
}

// 3. ADMIN DASHBOARD LOGIC
function initAdminDashboard() {
    // Stats & Requests
    db.collection('requisitions').orderBy('date', 'desc').onSnapshot(snap => {
        let pending = 0;
        let html = '';
        snap.forEach(doc => {
            const r = doc.data();
            if(!r.status || r.status === 'Pending') {
                pending++;
                const itemsStr = r.items.map(i => i.itemName).join(', ');
                html += `
                    <tr>
                        <td>${new Date(r.date).toLocaleDateString()}</td>
                        <td>${r.division}</td>
                        <td>${itemsStr}</td>
                        <td><span class="badge badge-Pending">Pending</span></td>
                        <td>
                            <button class="action-btn btn-approve" onclick="setStatus('${doc.id}', 'Approved')">✔</button>
                            <button class="action-btn btn-reject" onclick="setStatus('${doc.id}', 'Rejected')">✖</button>
                        </td>
                    </tr>
                `;
            }
        });
        document.getElementById('adm-pending').innerText = pending;
        document.getElementById('requestTable').innerHTML = html;
    });

    // Total Stock
    db.collection('inventory').onSnapshot(snap => {
        let total = 0;
        snap.forEach(doc => total += doc.data().currentQty);
        document.getElementById('adm-stock').innerText = total;
    });
}

function setStatus(id, status) {
    if(confirm('Set status to ' + status + '?')) {
        db.collection('requisitions').doc(id).update({status: status});
    }
}

window.logout = logout;
window.nav = nav;
window.setStatus = setStatus;
