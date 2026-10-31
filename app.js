// 1. Nhúng các hàm cần thiết từ thư viện Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// 2. Cấu hình Firebase của dự án TapHoa POS
const firebaseConfig = {
    apiKey: "AIzaSyBZd69buFrghWgBEjocyYPKn_Mh3PSDu7Q",
    authDomain: "taphoa-pos-9f377.firebaseapp.com",
    projectId: "taphoa-pos-9f377",
    storageBucket: "taphoa-pos-9f377.firebasestorage.app",
    messagingSenderId: "84889657561",
    appId: "1:84889657561:web:4ef2d4886d668a80621ec8"
};

// Khởi tạo ứng dụng và kết nối Cơ sở dữ liệu
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Biến lưu trữ giỏ hàng hiện tại
let cart = [];

// ==========================================
// PHẦN 1: QUẢN LÝ SẢN PHẨM (CỘT TRÁI)
// ==========================================

function loadProducts() {
    const productList = document.getElementById('productList');
    
    // Lắng nghe dữ liệu realtime từ collection 'products'
    onSnapshot(collection(db, "products"), (snapshot) => {
        productList.innerHTML = ''; 
        
        snapshot.forEach((documentSnapshot) => {
            const product = documentSnapshot.data();
            const formattedPrice = product.price.toLocaleString('vi-VN') + ' đ';
            // Mặc định cost (giá vốn) là 0 nếu bạn lỡ quên chưa nhập trong database
            const cost = product.cost || 0; 
            
            const productHTML = `
                <div class="col">
                    <div class="card product-card h-100 p-2" onclick="addToCart('${documentSnapshot.id}', '${product.name}', ${product.price}, ${cost})">
                        <h6 class="card-title mb-1" style="font-size: 0.95rem;">${product.name}</h6>
                        <span class="text-danger fw-bold">${formattedPrice}</span>
                        <small class="text-muted">Tồn: ${product.stock}</small>
                    </div>
                </div>
            `;
            productList.innerHTML += productHTML;
        });
    });
}

// Chạy hàm lấy dữ liệu ngay khi mở trang web
loadProducts();


// ==========================================
// PHẦN 2: QUẢN LÝ GIỎ HÀNG (CỘT PHẢI)
// ==========================================

// Hàm thêm hàng vào giỏ
window.addToCart = function(id, name, price, cost) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ id, name, price, cost, qty: 1 });
    }
    renderCart();
    calculateChange(); // Tính lại tiền thối nếu khách đang nhập dở tiền đưa
}

// Hàm tăng/giảm số lượng
window.updateQty = function(index, change) {
    cart[index].qty += change;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1); // Xóa khỏi giỏ nếu số lượng = 0
    }
    renderCart();
    calculateChange();
}

// Hàm xóa toàn bộ giỏ hàng
window.clearCart = function() {
    cart = [];
    renderCart();
    calculateChange();
}

// Hàm vẽ lại danh sách giỏ hàng ra HTML
function renderCart() {
    const cartList = document.getElementById('cartList');
    const totalPriceEl = document.getElementById('totalPrice');
    
    cartList.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        
        cartList.innerHTML += `
            <div class="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                <div>
                    <h6 class="mb-0" style="font-size: 0.9rem;">${item.name}</h6>
                    <small class="text-danger">${item.price.toLocaleString('vi-VN')} đ</small>
                </div>
                <div class="d-flex align-items-center">
                    <button class="btn btn-sm btn-outline-secondary px-2 py-0" onclick="updateQty(${index}, -1)">-</button>
                    <span class="mx-2 fw-bold">${item.qty}</span>
                    <button class="btn btn-sm btn-outline-secondary px-2 py-0" onclick="updateQty(${index}, 1)">+</button>
                </div>
            </div>
        `;
    });

    totalPriceEl.innerText = total.toLocaleString('vi-VN') + ' đ';
}


// ==========================================
// PHẦN 3: XỬ LÝ THANH TOÁN
// ==========================================

// Hàm tính tự động tiền thối cho khách
window.calculateChange = function() {
    let total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let customerPay = document.getElementById('customerPay').value;
    let changeMoneyEl = document.getElementById('changeMoney');
    
    if (customerPay && Number(customerPay) > total) {
        let change = Number(customerPay) - total;
        changeMoneyEl.innerText = change.toLocaleString('vi-VN') + ' đ';
    } else {
        changeMoneyEl.innerText = '0 đ';
    }
}

// Hàm thực hiện Thanh Toán (Lưu đơn hàng và Trừ tồn kho)
window.checkout = async function() {
    if (cart.length === 0) {
        alert("Giỏ hàng đang trống! Vui lòng chọn món trước khi thanh toán.");
        return;
    }

    let customerInfo = document.getElementById('customerInfo').value || "Khách lẻ";
    let totalAmount = 0;
    let totalProfit = 0;

    // Tính tổng doanh thu và tổng lợi nhuận của đơn này
    cart.forEach(item => {
        totalAmount += item.price * item.qty;
        totalProfit += (item.price - item.cost) * item.qty;
    });

    try {
        // 1. Lưu đơn hàng vào collection 'orders'
        await addDoc(collection(db, "orders"), {
            timestamp: new Date(),
            customerInfo: customerInfo,
            totalAmount: totalAmount,
            totalProfit: totalProfit,
            items: cart
        });

        // 2. Trừ tồn kho trong collection 'products' tương ứng với những món đã mua
        for (let item of cart) {
            const productRef = doc(db, "products", item.id);
            await updateDoc(productRef, {
                stock: increment(-item.qty)
            });
        }
        
        alert("Thanh toán thành công!");
        
        // 3. Làm sạch giỏ hàng và các ô nhập liệu sau khi bán xong
        clearCart();
        document.getElementById('customerInfo').value = "";
        document.getElementById('customerPay').value = "";
        document.getElementById('changeMoney').innerText = "0 đ";

    } catch (error) {
        console.error("Lỗi khi thanh toán: ", error);
        alert("Có lỗi xảy ra, không thể thanh toán! Vui lòng kiểm tra tab Console để xem chi tiết.");
    }
}