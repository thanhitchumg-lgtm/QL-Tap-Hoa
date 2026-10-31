import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
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

window.logout = function() {
    signOut(auth).then(() => { window.location.href = "login.html"; });
}

let cart = [];

function loadProducts() {
    const productList = document.getElementById('productList');
    onSnapshot(collection(db, "products"), (snapshot) => {
        productList.innerHTML = ''; 
        snapshot.forEach((documentSnapshot) => {
            const product = documentSnapshot.data();
            const formattedPrice = product.price.toLocaleString('vi-VN') + ' đ';
            const cost = product.cost || 0; 
            const barcode = product.barcode || ""; // Lấy mã vạch từ Firebase
            
            // Gắn thêm thuộc tính data-name và data-barcode để tìm kiếm
            productList.innerHTML += `
                <div class="col product-item" data-name="${product.name.toLowerCase()}" data-barcode="${barcode}">
                    <div class="card product-card h-100 p-2" onclick="addToCart('${documentSnapshot.id}', '${product.name}', ${product.price}, ${cost})">
                        <h6 class="card-title mb-1" style="font-size: 0.95rem;">${product.name}</h6>
                        <span class="text-danger fw-bold">${formattedPrice}</span>
                        <small class="text-muted">Tồn: ${product.stock}</small>
                    </div>
                </div>
            `;
        });
    });
}

window.addToCart = function(id, name, price, cost) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) { existingItem.qty += 1; } 
    else { cart.push({ id, name, price, cost, qty: 1 }); }
    renderCart();
    calculateChange();
}

window.updateQty = function(index, change) {
    cart[index].qty += change;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    renderCart();
    calculateChange();
}

window.clearCart = function() {
    cart = [];
    renderCart();
    calculateChange();
}

function renderCart() {
    const cartList = document.getElementById('cartList');
    const totalPriceEl = document.getElementById('totalPrice');
    cartList.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price * item.qty;
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

window.calculateChange = function() {
    let total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let customerPay = document.getElementById('customerPay').value;
    let changeMoneyEl = document.getElementById('changeMoney');
    
    if (customerPay && Number(customerPay) > total) {
        changeMoneyEl.innerText = (Number(customerPay) - total).toLocaleString('vi-VN') + ' đ';
    } else {
        changeMoneyEl.innerText = '0 đ';
    }
}

window.checkout = async function() {
    if (cart.length === 0) return alert("Giỏ hàng đang trống!");

    let customerInfo = document.getElementById('customerInfo').value || "Khách lẻ";
    let totalAmount = 0, totalProfit = 0;

    cart.forEach(item => {
        totalAmount += item.price * item.qty;
        totalProfit += (item.price - item.cost) * item.qty;
    });

    try {
        await addDoc(collection(db, "orders"), {
            timestamp: new Date(),
            customerInfo: customerInfo,
            totalAmount: totalAmount,
            totalProfit: totalProfit,
            items: cart
        });

        for (let item of cart) {
            await updateDoc(doc(db, "products", item.id), { stock: increment(-item.qty) });
        }
        
        alert("Thanh toán thành công!");
        clearCart();
        document.getElementById('customerInfo').value = "";
        document.getElementById('customerPay').value = "";
        document.getElementById('changeMoney').innerText = "0 đ";
    } catch (error) {
        console.error(error);
        alert("Lỗi khi thanh toán!");
    }
}

// BƯỚC SỬA LỖI: Chỉ tải sản phẩm sau khi Firebase xác nhận đã đăng nhập thành công
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        loadProducts(); 
    }
});
// XỬ LÝ TÌM KIẾM VÀ MÁY QUÉT MÁY VẠCH
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keyup', function(e) {
        const keyword = this.value.toLowerCase().trim();
        const items = document.querySelectorAll('.product-item');
        let firstVisibleItem = null;

        // Lọc sản phẩm theo tên hoặc mã vạch
        items.forEach(item => {
            const name = item.getAttribute('data-name');
            const barcode = item.getAttribute('data-barcode');

            if (name.includes(keyword) || barcode.includes(keyword)) {
                item.style.display = ""; // Hiện nếu khớp
                if (!firstVisibleItem) firstVisibleItem = item; // Ghi nhớ món hàng đầu tiên tìm thấy
            } else {
                item.style.display = "none"; // Ẩn nếu không khớp
            }
        });

        // Nếu người dùng nhấn Enter (hoặc do Máy quét mã vạch tự động nhấn Enter)
        if (e.key === 'Enter') {
            if (firstVisibleItem) {
                // Tự động "Click" vào sản phẩm đó để ném vào Giỏ hàng
                firstVisibleItem.querySelector('.card').click();
                
                // Xóa trắng ô tìm kiếm để sẵn sàng quét món tiếp theo
                this.value = '';
                
                // Hiển thị lại toàn bộ danh sách hàng hóa
                items.forEach(item => item.style.display = "");
            }
        }
    });
}
