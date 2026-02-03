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
                currentUserDivision = data.division || "Unknown Division";
                
                if(document.getElementById('division-name')) document.getElementById('division-name').innerText = currentUserDivision;
                if(document.getElementById('ris-div-name-1')) document.getElementById('ris-div-name-1').innerText = currentUserDivision;
                if(document.getElementById('ris-div-name-2')) document.getElementById('ris-div-name-2').innerText = currentUserDivision;
                if(document.getElementById('inv-div-label')) document.getElementById('inv-div-label').innerText = currentUserDivision;
                
                initUserDashboard();
            }
        });
    } else {
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

// 3. DATA LOGIC (WITH DELETE BUTTON)
function initUserDashboard() {
    db.collection('inventory').where('division', '==', currentUserDivision).onSnapshot(snap => {
        const tbody = document.getElementById('inventoryTable');
        const select = document.getElementById('itemSelect');
        
        if(tbody) tbody.innerHTML = ''; 
        if(select) select.innerHTML = '<option value="">Select Item...</option>';

        let totalStock = 0;
        inventoryData = [];

        snap.forEach(doc => {
            const d = doc.data(); d.id = doc.id;
            inventoryData.push(d);
            totalStock += d.currentQty;
            
            // Render Table Row with DELETE Button
            if(tbody) {
                tbody.innerHTML += `
                    <tr>
                        <td>${d.itemName}</td>
                        <td>${d.initialQty}</td>
                        <td>${d.unitPrice}</td>
                        <td>${d.currentQty}</td>
                        <td><button class="btn-delete" onclick="deleteItem('${d.id}')">Delete</button></td>
                    </tr>`;
            }
            if(select) {
                select.innerHTML += `<option value="${d.id}">${d.itemName} (Stock: ${d.currentQty})</option>`;
            }
        });
        
        if(document.getElementById('dash-total-items')) 
            document.getElementById('dash-total-items').innerText = totalStock;
    });

    db.collection('requisitions').where('division', '==', currentUserDivision).onSnapshot(s => {
        if(document.getElementById('dash-total-reqs'))
            document.getElementById('dash-total-reqs').innerText = s.size;
    });
}

// 4. DELETE FUNCTIONS (NEW!)
function deleteItem(id) {
    if(!confirm("Are you sure you want to delete this item?")) return;
    db.collection('inventory').doc(id).delete().catch(e => alert(e.message));
}

async function clearMyInventory() {
    if(!confirm("⚠ WARNING: This will delete ALL inventory items for " + currentUserDivision + ".\n\nUse this if you uploaded the wrong file.\n\nAre you sure?")) return;
    
    // Get all items for this division
    const snap = await db.collection('inventory').where('division', '==', currentUserDivision).get();
    
    // Batch delete
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    alert("All inventory items cleared.");
}

// 5. UPLOAD LOGIC
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
                    itemName: String(row.Name), 
                    initialQty: Number(row.Qty), 
                    currentQty: Number(row.Qty), 
                    unitPrice: Number(row.Price||0), 
                    division: currentUserDivision,
                    requestDates: []
                });
            }
        });
        batch.commit().then(()=>alert(count + ' Items Uploaded Successfully!'));
    };
    reader.readAsArrayBuffer(input.files[0]);
}

// 6. MODAL & SLIP LOGIC
function openModal() { 
    document.getElementById('reqModal').classList.add('open'); 
    document.getElementById('risNo_1').innerText = ''; 
    document.getElementById('risNo_2').innerText = ''; 
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
    const existing = slipItems.find(i => i.id === id);
    if(existing) { existing.reqQty += qty; } else { slipItems.push({ ...item, reqQty: qty }); }
    renderSlip();
}

function renderSlip() {
    ['risTableBody_1', 'risTableBody_2'].forEach(tableId => {
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

function exportToExcel() {
    let data = [];
    for(let k=0; k<2; k++) {
        data.push(["", "", "", "", "", "", "Appendix 63"]);
        data.push(["REQUISITION AND ISSUE SLIP"]);
        data.push(["Entity Name :", "", "DepED RO I", "", "", "", "Fund Cluster :", "01"]);
        data.push(["Division :", currentUserDivision, "", "", "", "Responsibility Center Code :", ""]);
        data.push(["Office :", "", "", "", "", "RIS No. :", ""]); 
        data.push(["Requisition", "", "", "", "Stock Available?", "", "Issue", ""]);
        data.push(["Stock No.", "Unit", "Description", "Quantity", "Yes", "No", "Quantity", "Remarks"]);
        slipItems.forEach((item) => {
            let cleanName = item.itemName.split(',')[0].split(';')[0].trim();
            data.push(["", "pc", cleanName, item.reqQty, "", "", "", ""]);
        });
        for(let i=0; i < (10 - slipItems.length); i++) data.push(["", "", "", "", "", "", "", ""]);
        data.push(["Purpose: Office Use"]);
        data.push(["", "Requested by:", "Approved by:", "Issued by:", "", "Received by:", ""]);
        data.push(["Signature:", "", "", "", "", "", ""]);
        data.push(["Printed Name:", "JOVANIE M. MAZON", "CESAR S. BUCSIT", "", "", "", ""]);
        data.push(["Designation:", "Admin Assistant I", "Admin Officer V", "", "", "", ""]);
        data.push(["Date:", "", "", "", "", "", ""]);
        data.push(["", "", "", "", "", "", "", ""]); 
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RIS_Double");
    XLSX.writeFile(wb, "Requisition_Issue_Slip_Double.xlsx");
}

async function submitRequisition() {
    if(!slipItems.length) return alert("No items!");
    const batch = db.batch();
    const today = new Date().toISOString();
    batch.set(db.collection('requisitions').doc(), { date: today, items: slipItems, division: currentUserDivision, status: 'Pending' });
    slipItems.forEach(item => {
        const ref = db.collection('inventory').doc(item.id);
        const current = inventoryData.find(i=>i.id===item.id).currentQty;
        batch.update(ref, { currentQty: current - item.reqQty, requestDates: firebase.firestore.FieldValue.arrayUnion(today) });
    });
    await batch.commit();
    alert("Requisition Submitted Successfully!");
    closeModal();
}

// EXPORT FUNCTIONS
window.logout = logout;
window.nav = nav;
window.handleFileUpload = handleFileUpload;
window.openModal = openModal;
window.closeModal = closeModal;
window.addItemToSlip = addItemToSlip;
window.submitRequisition = submitRequisition;
window.exportToExcel = exportToExcel;
window.deleteItem = deleteItem;
window.clearMyInventory = clearMyInventory;
