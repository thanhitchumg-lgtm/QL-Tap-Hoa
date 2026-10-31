import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// Cấu hình Firebase
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

window.loadDashboard = async function() {
    // Reset giao diện
    document.getElementById('todayRevenue').innerText = 'Đang tính...';
    document.getElementById('recentOrdersTable').innerHTML = '<tr><td colspan="5" class="text-center">Đang tải dữ liệu...</td></tr>';

    let todayRevenue = 0, todayProfit = 0, todayOrderCount = 0;
    let monthRevenue = 0, monthProfit = 0, monthOrderCount = 0;

    // Lấy thời gian mốc (Đầu ngày hôm nay và Đầu tháng này)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // Do cửa hàng nhỏ, ta lấy 100 đơn gần nhất để tính toán hiển thị cho nhanh
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(100));
    
    try {
        const querySnapshot = await getDocs(q);
        const tableBody = document.getElementById('recentOrdersTable');
        tableBody.innerHTML = ''; 

        let rowCount = 0;

        querySnapshot.forEach((doc) => {
            const order = doc.data();
            
            // Bỏ qua nếu đơn hàng bị lỗi hoặc không có timestamp
            if (!order.timestamp) return; 

            // Xử lý an toàn cho định dạng thời gian
            let orderTime;
            if (typeof order.timestamp.toMillis === 'function') {
                orderTime = order.timestamp.toMillis();
            } else if (order.timestamp.seconds) {
                orderTime = order.timestamp.seconds * 1000;
            } else {
                orderTime = new Date(order.timestamp).getTime();
            }
            //const orderTime = order.timestamp.toMillis(); // Chuyển timestamp Firebase sang mili-giây

            // 1. Tính toán Thống kê Tháng
            if (orderTime >= startOfMonth) {
                monthRevenue += order.totalAmount;
                monthProfit += order.totalProfit;
                monthOrderCount++;
            }

            // 2. Tính toán Thống kê Ngày
            if (orderTime >= startOfToday) {
                todayRevenue += order.totalAmount;
                todayProfit += order.totalProfit;
                todayOrderCount++;
            }

            // 3. Hiển thị 10 đơn hàng gần nhất ra bảng
            if (rowCount < 10) {
                // Tạo dòng Header cho Đơn hàng
                const dateStr = new Date(orderTime).toLocaleString('vi-VN');
                let orderHTML = `
                    <tr class="table-secondary">
                        <td colspan="3"><strong>Mã đơn:</strong> ${doc.id} - ${dateStr} - ${order.customerInfo}</td>
                        <td class="text-end fw-bold text-danger">${order.totalAmount.toLocaleString('vi-VN')} đ</td>
                        <td class="text-end fw-bold text-success">${order.totalProfit.toLocaleString('vi-VN')} đ</td>
                    </tr>
                `;
                
                // Duyệt qua từng món trong đơn để in chi tiết
                if (order.items && order.items.length > 0) {
                    order.items.forEach(item => {
                        const itemProfit = (item.price - item.cost) * item.qty;
                        orderHTML += `
                            <tr>
                                <td><span class="ms-3 text-muted">↳ ${item.name}</span></td>
                                <td class="text-center">${item.qty}</td>
                                <td class="text-end">${item.price.toLocaleString('vi-VN')} đ</td>
                                <td class="text-end">${(item.price * item.qty).toLocaleString('vi-VN')} đ</td>
                                <td class="text-end">${itemProfit.toLocaleString('vi-VN')} đ</td>
                            </tr>
                        `;
                    });
                }
                tableBody.innerHTML += orderHTML;
                rowCount++;
            }
        });

        // 4. Đẩy số liệu đã tính lên 4 thẻ Thống kê
        document.getElementById('todayRevenue').innerText = todayRevenue.toLocaleString('vi-VN') + ' đ';
        document.getElementById('todayProfit').innerText = todayProfit.toLocaleString('vi-VN') + ' đ';
        document.getElementById('todayOrders').innerText = `${todayOrderCount} đơn`;
        
        document.getElementById('monthRevenue').innerText = monthRevenue.toLocaleString('vi-VN') + ' đ';
        document.getElementById('monthProfit').innerText = monthProfit.toLocaleString('vi-VN') + ' đ';
        document.getElementById('monthOrders').innerText = `${monthOrderCount} đơn`;

        if(rowCount === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Chưa có đơn hàng nào</td></tr>';
        }

    } catch (error) {
        console.error("Lỗi khi tải báo cáo: ", error);
        alert("Lỗi tải dữ liệu. Hãy kiểm tra lại kết nối.");
    }
}

// Chạy hàm thống kê khi load trang
window.loadDashboard();