// user/user.js

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

let inventoryData = [], slipItems = [];
let currentUserDivision = ""; 

// 2. CHECK AUTH STATE
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).get().then(doc => {
            if(doc.exists) {
                const data = doc.data();
                currentUserDivision = data.division;
                document.getElementById('division-name').innerText = currentUserDivision;
                initUserDashboard(); // Load data
            }
        });
    } else {
        // If not logged in, go back to main login
        window.location.href = "../index.html";
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

// 3. DATA LOGIC
function initUserDashboard() {
    db.collection('inventory').onSnapshot(snap => {
        const tbody = document.getElementById('inventoryTable');
        if(tbody) tbody.innerHTML = ''; 
        let totalStock = 0;
        
        inventoryData = [];
        snap.forEach(doc => {
            const d = doc.data(); d.id = doc.id;
            inventoryData.push(d);
            totalStock += d.currentQty;
            
            if(tbody) {
                tbody.innerHTML += `<tr><td>${d.itemName}</td><td>${d.initialQty}</td><td>${d.unitPrice}</td><td>${d.currentQty}</td></tr>`;
            }
        });
        if(document.getElementById('dash-total-items')) 
            document.getElementById('dash-total-items').innerText = totalStock;
    });

    // Count Requests
    db.collection('requisitions').where('division', '==', currentUserDivision).onSnapshot(s => {
        if(document.getElementById('dash-total-reqs'))
            document.getElementById('dash-total-reqs').innerText = s.size;
    });
}

// 4. UPLOAD EXCEL
function handleFileUpload(input) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const batch = db.batch();
        json.forEach(row => {
            if(row.Name && row.Qty) {
                batch.set(db.collection('inventory').doc(), {
                    itemName: String(row.Name), initialQty: Number(row.Qty), currentQty: Number(row.Qty), unitPrice: Number(row.Price||0), requestDates: []
                });
            }
        });
        batch.commit().then(()=>alert('Upload Successful!'));
    };
    reader.readAsArrayBuffer(input.files[0]);
}

// Make functions accessible to HTML
window.logout = logout;
window.nav = nav;
window.handleFileUpload = handleFileUpload;
// Add window.openModal = openModal; etc. if you pasted the Modal code in HTML
