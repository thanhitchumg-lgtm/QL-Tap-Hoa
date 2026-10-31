import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZd69buFrghWgBEjocyYPKn_Mh3PSDu7Q",
    authDomain: "taphoa-pos-9f377.firebaseapp.com",
    projectId: "taphoa-pos-9f377",
    storageBucket: "taphoa-pos-9f377.firebasestorage.app",
    messagingSenderId: "84889657561",
    appId: "1:84889657561:web:4ef2d4886d668a80621ec8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.login = function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Thành công -> Chuyển hướng vào trang bán hàng
            window.location.href = "index.html"; 
        })
        .catch((error) => {
            // Thất bại -> Báo lỗi
            document.getElementById('errorMsg').style.display = "block";
        });
}