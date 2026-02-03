// 1. CONFIGURATION (Same as User)
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

// Set Date
document.getElementById('current-date').innerText = new Date().toLocaleDateString();

// Check Auth
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "../index.html";
    } else {
        initDashboard();
        initInventory();
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

// --- DASHBOARD LOGIC ---
function initDashboard() {
    // Listen to Requisitions
    db.collection('requisitions').orderBy('date', 'desc').onSnapshot(snap => {
        let total = 0, approved = 0, pending = 0;
        let html = '';
        
        snap.forEach(doc => {
            const r = doc.data();
            total++;
            if (r.status === 'Approved') approved++;
            else if (!r.status || r.status === 'Pending') pending++;

            // Create Table Row
            const dateStr = new Date(r.date).toLocaleDateString();
            const itemsStr = r.items.map(i => `${i.itemName} (${i.reqQty})`).join(', ');
            const status = r.status || 'Pending';
            
            // Buttons only if Pending
            let actions = '';
            if(status === 'Pending') {
                actions = `
                    <button class="action-btn btn-approve" onclick="setStatus('${doc.id}', 'Approved')">✓</button>
                    <button class="action-btn btn-reject" onclick="setStatus('${doc.id}', 'Rejected')">✗</button>
                `;
            }

            html += `
                <tr>
                    <td>${dateStr}</td>
                    <td><strong>${r.division}</strong></td>
                    <td style="font-size:0.9em; color:#555;">${itemsStr}</td>
                    <td><span class="badge badge-${status}">${status}</span></td>
                    <td>${actions}</td>
                </tr>
            `;
        });

        // Update Stats Cards
        document.getElementById('stat-total-reqs').innerText = total;
        document.getElementById('stat-approved').innerText = approved;
        document.getElementById('stat-pending').innerText = pending;
        
        // Update Table
        document.getElementById('requestTable').innerHTML = html;

        // Update Chart
        updateChart(approved, pending, total - approved - pending);
    });
}

// --- INVENTORY / PPMP MONITOR ---
function initInventory() {
    db.collection('inventory').onSnapshot(snap => {
        let totalStock = 0;
        let html = '';
        
        snap.forEach(doc => {
            const d = doc.data();
            totalStock += d.currentQty;
            html += `
                <tr>
                    <td>${d.itemName}</td>
                    <td>${d.initialQty}</td>
                    <td><strong>${d.currentQty}</strong></td>
                    <td>₱${d.unitPrice}</td>
                </tr>
            `;
        });

        document.getElementById('stat-stock').innerText = totalStock;
        document.getElementById('inventoryTable').innerHTML = html;
    });
}

// --- ACTIONS ---
function setStatus(docId, status) {
    if(!confirm(`Mark this request as ${status}?`)) return;
    
    db.collection('requisitions').doc(docId).update({
        status: status
    }).then(() => {
        // Optional: If rejected, you might want to add stock back. 
        // For now, we assume stock was deducted upon request (User side).
        // If you want logic to "Return Stock" on reject, ask me!
        alert("Status Updated");
    });
}

function updateChart(approved, pending, rejected) {
    const ctx = document.getElementById('adminChart');
    if (window.myAdminChart) window.myAdminChart.destroy();
    
    window.myAdminChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Approved', 'Pending', 'Rejected'],
            datasets: [{
                data: [approved, pending, rejected],
                backgroundColor: ['#27ae60', '#f39c12', '#e74c3c']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function filterInventory() {
    const input = document.getElementById('searchInventory');
    const filter = input.value.toUpperCase();
    const table = document.getElementById('inventoryTable');
    const tr = table.getElementsByTagName('tr');

    for (let i = 0; i < tr.length; i++) {
        const td = tr[i].getElementsByTagName('td')[0];
        if (td) {
            const txt = td.textContent || td.innerText;
            tr[i].style.display = txt.toUpperCase().indexOf(filter) > -1 ? "" : "none";
        }
    }
}

function resetInventory() {
    if(!confirm("⚠ DANGER: This will reset all stock counts to initial values. Continue?")) return;
    // Logic to reset would go here (Batch update)
    // For safety, leaving this as an alert placeholder for now.
    alert("Reset function triggered (Logic placeholder)");
}
