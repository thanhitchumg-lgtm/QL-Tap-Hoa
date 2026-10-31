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

// Bật Modal Hóa Đơn để xem trước
// BẬT MODAL HÓA ĐƠN TRỰC TIẾP (Kèm mã VietQR)
// HÀM 1: BẬT BẢNG BILL XEM TRƯỚC KHI BẤM THANH TOÁN
window.checkout = function() {
    if (cart.length === 0) return alert("Giỏ hàng đang trống!");

    let totalAmount = 0;
    cart.forEach(item => totalAmount += item.price * item.qty);
    
    let customerPay = document.getElementById('customerPay').value;
    let change = customerPay && Number(customerPay) > totalAmount ? Number(customerPay) - totalAmount : 0;
    let customerInfo = document.getElementById('customerInfo').value || "Khách Lẻ";
    let orderId = "HD" + Date.now().toString().slice(-6);
    let now = new Date().toLocaleString('vi-VN');

    // Link tạo QR code tự động với thông tin ngân hàng của bạn
    let qrUrl = `https://img.vietqr.io/image/tcb-0934588820-print.png?amount=${totalAmount}&addInfo=${orderId}&accountName=NGUYEN%20HUU%20THANH`;

    let billHtml = `
        <div class="watermark">CHƯA LƯU</div>
        <h4 class="text-center mb-0 fw-bold fs-5">TẠP HÓA</h4>
        <div class="text-center" style="border-bottom: 2px dashed #ccc; margin-bottom: 15px; padding-bottom: 10px;">
            <h5 class="fw-bold mb-1 fs-6 mt-2">HÓA ĐƠN BÁN LẺ</h5>
            <small>Mã HĐ: ${orderId}</small><br>
            <small>Ngày: ${now}</small><br>
            <small class="fw-bold mt-1 d-block">Khách: ${customerInfo}</small>
        </div>
        <table style="width: 100%; font-size: 14px; margin-bottom: 15px;">
            <tr style="border-bottom: 2px dashed #ccc;">
                <th class="text-start pb-2">Tên Hàng</th>
                <th class="text-center pb-2">SL</th>
                <th class="text-end pb-2">TTiền</th>
            </tr>
    `;

    cart.forEach(item => {
        billHtml += `
            <tr>
                <td class="pt-2">${item.name}</td>
                <td class="text-center pt-2">${item.qty}</td>
                <td class="text-end pt-2">${(item.price * item.qty).toLocaleString('vi-VN')}</td>
            </tr>
        `;
    });

    billHtml += `
        </table>
        <div style="border-top: 2px dashed #ccc; padding-top: 15px; font-size: 14px;">
            <div class="d-flex justify-content-between fw-bold fs-6 mb-1">
                <span>TỔNG CỘNG:</span>
                <span>${totalAmount.toLocaleString('vi-VN')} đ</span>
            </div>
            <div class="d-flex justify-content-between mb-1">
                <span>Khách đưa:</span>
                <span>${customerPay ? Number(customerPay).toLocaleString('vi-VN') : totalAmount.toLocaleString('vi-VN')} đ</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>Tiền thối:</span>
                <span>${change.toLocaleString('vi-VN')} đ</span>
            </div>
        </div>
        
        <div class="text-center mt-4" style="border-top: 2px dashed #ccc; padding-top: 15px;">
            <span class="fw-bold fs-6">QUÉT MÃ CHUYỂN KHOẢN</span><br>
            <img src="${qrUrl}" alt="VietQR" style="width: 180px; margin-top: 10px;">
        </div>
        <p class="text-center mt-3 mb-0" style="font-style: italic; font-size: 13px;">Cảm ơn Quý khách!</p>
    `;

    document.getElementById('billContent').innerHTML = billHtml;
    
    // Bật bảng Bill lên
    const billModal = new bootstrap.Modal(document.getElementById('billModal'));
    billModal.show();
}

// HÀM 2: XỬ LÝ KHI BẤM NÚT "IN HÓA ĐƠN" HOẶC "XONG (LƯU)"
window.processOrder = async function(action) {
    if (action === 'print') {
        window.print(); // Gọi lệnh in của trình duyệt
    }

    let customerInfo = document.getElementById('customerInfo').value || "Khách Lẻ";
    let totalAmount = 0, totalProfit = 0;
    
    cart.forEach(item => {
        totalAmount += item.price * item.qty;
        totalProfit += (item.price - item.cost) * item.qty;
    });

    try {
        // Lưu lên Firebase
        await addDoc(collection(db, "orders"), {
            timestamp: new Date(),
            customerInfo: customerInfo,
            totalAmount: totalAmount,
            totalProfit: totalProfit,
            items: cart
        });

        // Trừ tồn kho
        for (let item of cart) {
            await updateDoc(doc(db, "products", item.id), { stock: increment(-item.qty) });
        }
        
        // Đóng bảng Bill và làm sạch giỏ hàng
        const modalEl = document.getElementById('billModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        clearCart();
        document.getElementById('customerInfo').value = "";
        document.getElementById('customerPay').value = "";
        document.getElementById('changeMoney').innerText = "0 đ";

    } catch (error) {
        console.error("Lỗi: ", error);
        alert("Có lỗi khi lưu đơn hàng!");
    }
}

// XỬ LÝ LƯU ĐƠN HÀNG & TRỪ KHO (Sau khi ấn IN hoặc XONG)
window.executeCheckout = async function(shouldPrint) {
    if (shouldPrint) {
        window.print(); // Gọi lệnh in của hệ thống, CSS sẽ tự động ẩn Watermark "CHƯA LƯU" & các nút bấm
    }

    let customerInfo = document.getElementById('customerInfo').value || "Khách Lẻ";
    let totalAmount = 0, totalProfit = 0;
    
    cart.forEach(item => {
        totalAmount += item.price * item.qty;
        totalProfit += (item.price - item.cost) * item.qty;
    });

    try {
        // 1. Lưu đơn vào Firebase Firestore
        await addDoc(collection(db, "orders"), {
            timestamp: new Date(),
            customerInfo: customerInfo,
            totalAmount: totalAmount,
            totalProfit: totalProfit,
            items: cart
        });

        // 2. Trừ tồn kho
        for (let item of cart) {
            await updateDoc(doc(db, "products", item.id), { stock: increment(-item.qty) });
        }
        
        // 3. Tự động đóng Modal
        const modalEl = document.getElementById('billModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        // 4. Làm sạch giỏ hàng & các ô nhập liệu (Không còn thông báo Alert làm phiền)
        clearCart();
        document.getElementById('customerInfo').value = "";
        document.getElementById('customerPay').value = "";
        document.getElementById('changeMoney').innerText = "0 đ";

    } catch (error) {
        console.error("Lỗi khi thanh toán: ", error);
        alert("Lỗi khi lưu đơn hàng! Vui lòng thử lại.");
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
// HÀM TẠO VÀ IN HÓA ĐƠN
window.printReceipt = function(customerInfo, cart, total, pay, change) {
    const printDiv = document.getElementById('printArea');
    const now = new Date().toLocaleString('vi-VN');
    
    let html = `
        <div style="width: 80mm; padding: 10px; font-family: monospace; font-size: 14px; color: black; margin: 0 auto;">
            <h4 style="text-align: center; margin: 0;">TẠP HÓA CỦA THÀNH</h4>
            <p style="text-align: center; margin: 5px 0;">ĐC: Đống Đa, Hà Nội<br>ĐT: 0934588820</p>
            <hr style="border: 1px dashed #000;">
            <p style="margin: 5px 0;"><strong>Ngày:</strong> ${now}</p>
            <p style="margin: 5px 0;"><strong>Khách:</strong> ${customerInfo}</p>
            <hr style="border: 1px dashed #000;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                <tr style="border-bottom: 1px solid #000;">
                    <th style="text-align: left; padding: 5px 0;">Món</th>
                    <th style="text-align: center; padding: 5px 0;">SL</th>
                    <th style="text-align: right; padding: 5px 0;">TT</th>
                </tr>
    `;
    
    cart.forEach(item => {
        html += `
            <tr>
                <td style="padding: 5px 0;">${item.name}</td>
                <td style="text-align: center; padding: 5px 0;">${item.qty}</td>
                <td style="text-align: right; padding: 5px 0;">${(item.price * item.qty).toLocaleString('vi-VN')}</td>
            </tr>
        `;
    });
    
    html += `
            </table>
            <hr style="border: 1px dashed #000;">
            <p style="text-align: right; margin: 5px 0;"><strong>Tổng cộng:</strong> ${total.toLocaleString('vi-VN')} đ</p>
            <p style="text-align: right; margin: 5px 0;"><strong>Khách đưa:</strong> ${pay ? Number(pay).toLocaleString('vi-VN') : total.toLocaleString('vi-VN')} đ</p>
            <p style="text-align: right; margin: 5px 0;"><strong>Tiền thối:</strong> ${change > 0 ? change.toLocaleString('vi-VN') : '0'} đ</p>
            <hr style="border: 1px dashed #000;">
            <p style="text-align: center; margin-top: 10px; font-style: italic;">Cảm ơn quý khách!</p>
        </div>
    `;
    
    printDiv.innerHTML = html;
    window.print(); // Gọi lệnh in của trình duyệt
}
