// ==========================================
// 1. CONFIGURATION (Compat Version)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDxPnmXxfno19bkj9VHP1Do97PDg0lp04s",
    authDomain: "supplies-monitoring.firebaseapp.com",
    projectId: "supplies-monitoring",
    storageBucket: "supplies-monitoring.firebasestorage.app",
    messagingSenderId: "524755577094",
    appId: "1:524755577094:web:cd3c45819698c3380a1687",
    measurementId: "G-033SS1BHK1"
};

// Initialize Firebase (Global Namespace)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global Variables
let inventoryData = [], slipItems = [];
let currentUserDivision = ""; 

// ==========================================
// 2. AUTHENTICATION LOGIC
// ==========================================
function login() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    
    auth.signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            console.log("Logged in:", userCredential.user.uid);
            // The onAuthStateChanged listener will handle the redirect
        })
        .catch((error) => {
            console.error("Login Failed:", error);
            document.getElementById('login-error').innerText = error.message;
        });
}

function logout() {
    auth.signOut().then(() => location.reload());
}

// LISTEN FOR LOGIN STATE
auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in
        document.getElementById('login-section').classList.add('hidden');
        
        // Check Role in Database
        db.collection('users').doc(user.uid).get().then(doc => {
            if(doc.exists) {
                const data = doc.data();
                currentUserDivision = data.division || "DepEd Division";
                
                if (data.role === 'admin') {
                    // Show Admin View
                    document.getElementById('admin-view').classList.remove('hidden');
                } else {
                    // Show User View
                    document.getElementById('user-view').classList.remove('hidden');
                    document.getElementById('user-division-name').innerText = `(${currentUserDivision})`;
                    // Update the Division Name on the RIS Form automatically
                    document.getElementById('ris-div-name-1').innerText = currentUserDivision;
                    
                    // Initialize Your User Logic
                    initUserDashboard(); 
                }
            } else {
                alert("User not found in database.");
                logout();
            }
        });
    } else {
        // User is logged out
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('user-view').classList.add('hidden');
        document.getElementById('admin-view').classList.add('hidden');
    }
});

// ==========================================
// 3. USER DASHBOARD LOGIC
// ==========================================
function nav(id, btn) {
    document.querySelectorAll('.section').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(e => e.classList.remove('active'));
    btn.classList.add('active');
}

function initUserDashboard() {
    loadInventory();
    loadStats();
}

function loadInventory() {
    db.collection('inventory').onSnapshot(snap => {
        inventoryData = [];
        let totalStock = 0;
        const tbody = document.getElementById('inventoryTable');
        const select = document.getElementById('itemSelect');
        
        if(tbody) tbody.innerHTML = ''; 
        if(select) select.innerHTML = '<option value="">Select Item...</option>';

        snap.forEach(doc => {
            const d = doc.data(); d.id = doc.id;
            inventoryData.push(d);
            totalStock += d.currentQty;
        });
        
        inventoryData.sort((a,b) => a.itemName.localeCompare(b.itemName));

        inventoryData.forEach(item => {
            let dates = item.requestDates ? item.requestDates.map(d=>new Date(d).toLocaleDateString()).join(', ') : '-';
            if(tbody) tbody.innerHTML += `<tr><td>${item.itemName}</td><td>${item.initialQty}</td><td>${item.unitPrice}</td><td>${dates}</td><td style="font-weight:bold;">${item.currentQty}</td></tr>`;
            if(select) select.innerHTML += `<option value="${item.id}">${item.itemName} (Stock: ${item.currentQty})</option>`;
        });
        
        if(document.getElementById('dash-total-items')) document.getElementById('dash-total-items').innerText = totalStock;
        updateChart();
    });
}

function loadStats() { 
    db.collection('requisitions').onSnapshot(s => {
        if(document.getElementById('dash-total-reqs')) document.getElementById('dash-total-reqs').innerText = s.size;
    }); 
}

function updateChart() {
    const ctx = document.getElementById('stockChart');
    if(!ctx) return;
    
    const data = inventoryData.slice(0, 15);
    if(window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: { labels: data.map(i=>i.itemName), datasets: [{ label:'Stock', data: data.map(i=>i.currentQty), backgroundColor:'#3498db' }] }
    });
}

// ==========================================
// 4. MODAL & SLIP LOGIC
// ==========================================
function openModal() { 
    document.getElementById('reqModal').classList.add('open'); 
    document.getElementById('risNo_1').innerText = ''; 
    slipItems=[]; 
    renderSlip(); 
}
function closeModal() { document.getElementById('reqModal').classList.remove('open'); }

function addItemToSlip() {
    const id = document.getElementById('itemSelect').value;
    const qty = Number(document.getElementById('itemQty').value);
    if(!id || qty<=0) return;
    const item = inventoryData.find(i=>i.id===id);
    if(qty > item.currentQty) return alert('Not enough stock!');
    
    // Check if already in slip
    const existing = slipItems.find(i => i.id === id);
    if(existing) {
        if (existing.reqQty + qty > item.currentQty) return alert('Total quantity exceeds stock!');
        existing.reqQty += qty;
    } else {
        slipItems.push({ ...item, reqQty: qty });
    }
    renderSlip();
}

function renderSlip() {
    const tableIds = ['risTableBody_1']; 
    tableIds.forEach(tableId => {
        const tbody = document.getElementById(tableId);
        if(!tbody) return;
        tbody.innerHTML = '';
        
        slipItems.forEach((item) => {
            let cleanName = item.itemName.split(',')[0].split(';')[0].trim();
            tbody.innerHTML += `<tr><td></td><td>pc</td><td style="text-align:left">${cleanName}</td><td>${item.reqQty}</td><td></td><td></td><td></td><td></td></tr>`;
        });
        
        for(let i=0; i < (10 - slipItems.length); i++) {
            tbody.innerHTML += `<tr class="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
        }
    });
}

async function submitRequisition() {
    if(!slipItems.length) return alert("No items!");
    const batch = db.batch();
    const today = new Date().toISOString();
    
    // Create Requisition Record
    const reqRef = db.collection('requisitions').doc();
    batch.set(reqRef, { 
        date: today, 
        items: slipItems,
        division: currentUserDivision, 
        status: 'Pending'
    });

    // Deduct from Inventory
    slipItems.forEach(item => {
        const ref = db.collection('inventory').doc(item.id);
        const current = inventoryData.find(i=>i.id===item.id).currentQty;
        batch.update(ref, { 
            currentQty: current - item.reqQty, 
            requestDates: firebase.firestore.FieldValue.arrayUnion(today) 
        });
    });

    await batch.commit();
    alert("Requisition Submitted Successfully!");
    closeModal();
}

// ==========================================
// 5. EXCEL & UPLOAD LOGIC
// ==========================================
function exportToExcel() {
    let data = [];
    data.push(["REQUISITION AND ISSUE SLIP"]);
    data.push(["Division:", currentUserDivision]);
    data.push(["Item", "Qty"]);
    slipItems.forEach(i => data.push([i.itemName, i.reqQty]));
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RIS");
    XLSX.writeFile(wb, "RIS_Request.xlsx");
}

function handleFileUpload(input) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const batch = db.batch();
        let count = 0;
        json.forEach(row => {
            if(row.Name && row.Qty) {
                count++;
                batch.set(db.collection('inventory').doc(), {
                    itemName: String(row.Name), initialQty: Number(row.Qty), currentQty: Number(row.Qty), unitPrice: Number(row.Price||0), requestDates: []
                });
            }
        });
        batch.commit().then(()=>alert(count + ' Items Imported!'));
    };
    reader.readAsArrayBuffer(input.files[0]);
}

async function resetInventory() {
    if(!confirm("⚠ RESET ALL STOCK? This cannot be undone.")) return;
    const batch = db.batch();
    inventoryData.forEach(item => {
        batch.update(db.collection('inventory').doc(item.id), { currentQty: item.initialQty, requestDates: [] });
    });
    // Optional: Delete requisitions
    const reqs = await db.collection('requisitions').get();
    reqs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    alert("System Reset Complete.");
}
