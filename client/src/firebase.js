import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyD8kuvyyR92OAqcIYsImY-oUlgjcwAarsA",
    authDomain: "joyblog-f40c5.firebaseapp.com",
    projectId: "joyblog-f40c5",
    storageBucket: "joyblog-f40c5.appspot.com",
    messagingSenderId: "415390273345",
    appId: "1:415390273345:web:e19990de3d87ce6f91dbc0",
    measurementId: "G-2RXYQ8LPKW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

export { auth };