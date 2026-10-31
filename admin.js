import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZd69buFrghWgBEjocyYPKn_Mh3PSDu7Q",
    authDomain: "taphoa-pos-9f377.firebaseapp.com",
    projectId: "taphoa-pos-9f377",
    storageBucket: "taphoa-pos-9f377.firebasestorage.app",
    messagingSenderId: "84889657561",
    appId: "1:84889657561:web:4ef2d4886d668a80621ec8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Bảo vệ trang
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "login.html";
});

window.logout = function() {
    signOut(auth).then(() => { window.location.href = "login.html"; });
}

window.loadDashboard = async function() {
    document.getElementById('todayRevenue').innerText = 'Đang tính...';
    const tableBody = document.getElementById('recentOrdersTable');
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Đang tải...</td></tr>';

    let todayRev = 0, todayProf = 0, todayCount = 0;
    let monthRev = 0, monthProf = 0, monthCount = 0;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(100));
    
    try {
        const querySnapshot = await getDocs(q);
        tableBody.innerHTML = ''; 
        let rowCount = 0;

        querySnapshot.forEach((doc) => {
            const order = doc.data();
            if (!order.timestamp) return; 

            let orderTime = typeof order.timestamp.toMillis === 'function' 
                ? order.timestamp.toMillis() 
                : (order.timestamp.seconds ? order.timestamp.seconds * 1000 : new Date(order.timestamp).getTime());

            if (orderTime >= startOfMonth) { monthRev += order.totalAmount; monthProf += order.totalProfit; monthCount++; }
            if (orderTime >= startOfToday) { todayRev += order.totalAmount; todayProf += order.totalProfit; todayCount++; }

            if (rowCount < 10) {
                const dateStr = new Date(orderTime).toLocaleString('vi-VN');
                let orderHTML = `
                    <tr class="table-secondary">
                        <td colspan="3"><strong>Đơn:</strong> ${dateStr} - ${order.customerInfo}</td>
                        <td class="text-end fw-bold text-danger">${order.totalAmount.toLocaleString('vi-VN')} đ</td>
                        <td class="text-end fw-bold text-success">${order.totalProfit.toLocaleString('vi-VN')} đ</td>
                    </tr>
                `;
                if (order.items) {
                    order.items.forEach(item => {
                        const itemProf = (item.price - item.cost) * item.qty;
                        orderHTML += `
                            <tr>
                                <td><span class="ms-3 text-muted">↳ ${item.name}</span></td>
                                <td class="text-center">${item.qty}</td>
                                <td class="text-end">${item.price.toLocaleString('vi-VN')} đ</td>
                                <td class="text-end">${(item.price * item.qty).toLocaleString('vi-VN')} đ</td>
                                <td class="text-end">${itemProf.toLocaleString('vi-VN')} đ</td>
                            </tr>
                        `;
                    });
                }
                tableBody.innerHTML += orderHTML;
                rowCount++;
            }
        });

        document.getElementById('todayRevenue').innerText = todayRev.toLocaleString('vi-VN') + ' đ';
        document.getElementById('todayProfit').innerText = todayProf.toLocaleString('vi-VN') + ' đ';
        document.getElementById('todayOrders').innerText = `${todayCount} đơn`;
        document.getElementById('monthRevenue').innerText = monthRev.toLocaleString('vi-VN') + ' đ';
        document.getElementById('monthProfit').innerText = monthProf.toLocaleString('vi-VN') + ' đ';
        document.getElementById('monthOrders').innerText = `${monthCount} đơn`;
        
        if(rowCount === 0) tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Chưa có đơn hàng</td></tr>';

    } catch (error) {
        console.error(error);
        alert("Lỗi tải báo cáo!");
    }
}
window.loadDashboard();
